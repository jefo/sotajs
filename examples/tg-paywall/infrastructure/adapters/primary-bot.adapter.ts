/**
 * Primary Telegram Bot Adapter
 *
 * Framework-free implementation with full business logic.
 * Replaces grammY-based adapter for Yandex Cloud Functions compatibility.
 * Uses only native https API - no external dependencies.
 *
 * Environment variables:
 * - BOT_TOKEN: Telegram bot token
 * - ADMIN_ID: Admin user ID (number)
 */

import * as https from "https";
import {
	createPlanCommand,
	subscribeUserCommand,
	confirmPaymentCommand,
	revokeAccessCommand,
	listPlansQuery,
	findSubscriptionByUserIdQuery,
	listActiveSubscriptionsQuery,
	checkAccessQuery,
	getFormattedMessageQuery,
	updateTemplateCommand,
	resetTemplateCommand,
} from "../../application";
import { findPlanByIdPort } from "../../application/ports/paywall.ports";
import { usePorts } from "../../../../lib";

/**
 * Telegram Bot API types
 */
type Update = {
	update_id: number;
	message?: Message;
	callback_query?: CallbackQuery;
	chat_join_request?: ChatJoinRequest;
};

type UpdateWithId = Update & { update_id: number };

type Message = {
	message_id: number;
	chat: { id: number };
	from?: { id: number; username?: string; first_name?: string };
	text?: string;
	data?: string;
};

type CallbackQuery = {
	id: string;
	from: { id: number; username?: string };
	data: string;
	message?: Message;
};

type ChatJoinRequest = {
	chat: { id: number; title?: string };
	from: { id: number; first_name?: string };
	date: number;
};

type InlineKeyboardButton = {
	text: string;
	url?: string;
	callback_data?: string;
	web_app?: { url: string };
};

type InlineKeyboard = InlineKeyboardButton[][];

/**
 * Session data for admin flows
 */
interface SessionData {
	step:
		| "idle"
		| "awaiting_plan_name"
		| "awaiting_plan_price"
		| "awaiting_plan_duration"
		| "awaiting_plan_channel"
		| "awaiting_template_content";
	newPlan: Partial<{
		name: string;
		price: number;
		duration: number;
		channelId: string;
	}>;
	editingTemplateKey?: string;
}

/**
 * Simple in-memory session store (for single-instance deployments)
 * For production, use Redis or database-backed sessions
 */
const sessions = new Map<number, SessionData>();

function getSession(userId: number): SessionData {
	if (!sessions.has(userId)) {
		sessions.set(userId, { step: "idle", newPlan: {} });
	}
	return sessions.get(userId)!;
}

function clearSession(userId: number) {
	sessions.delete(userId);
}

/**
 * Primary Bot Adapter Class
 */
export class PrimaryBotAdapter {
	private token: string;
	private adminId: number;
	private baseUrl: string;

	constructor(token: string, adminId: number) {
		this.token = token;
		this.adminId = adminId;
		this.baseUrl = `https://api.telegram.org/bot${token}`;
	}

	/**
	 * Call Telegram API using native https
	 */
	private async callAPI(method: string, params: Record<string, any> = {}) {
		const url = `${this.baseUrl}/${method}`;
		const body = JSON.stringify(params);

		return new Promise((resolve, reject) => {
			const req = https.request(
				url,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Content-Length": body.length,
					},
				},
				(res) => {
					let data = "";
					res.on("data", (chunk) => {
						data += chunk;
					});
					res.on("end", () => {
						try {
							resolve(JSON.parse(data));
						} catch (e) {
							reject(new Error(`Failed to parse response: ${e}`));
						}
					});
				},
			);

			req.on("error", reject);
			req.write(body);
			req.end();
		});
	}

	/**
	 * Send message
	 */
	async sendMessage(
		chatId: number,
		text: string,
		options?: {
			parseMode?: "HTML" | "Markdown";
			replyMarkup?: InlineKeyboard;
		},
	) {
		console.log(`[Bot] Sending message to ${chatId}: ${text.slice(0, 50)}...`);
		return this.callAPI("sendMessage", {
			chat_id: chatId,
			text,
			parse_mode: options?.parseMode,
			reply_markup: options?.replyMarkup ? { inline_keyboard: options.replyMarkup } : undefined,
		});
	}

	/**
	 * Answer callback query
	 */
	async answerCallbackQuery(callbackQueryId: string, text?: string) {
		return this.callAPI("answerCallbackQuery", {
			callback_query_id: callbackQueryId,
			text,
		});
	}

	/**
	 * Edit message text
	 */
	async editMessageText(
		chatId: number,
		messageId: number,
		text: string,
		options?: {
			parseMode?: "HTML" | "Markdown";
			replyMarkup?: InlineKeyboard;
		},
	) {
		return this.callAPI("editMessageText", {
			chat_id: chatId,
			message_id: messageId,
			text,
			parse_mode: options?.parseMode,
			reply_markup: options?.replyMarkup ? { inline_keyboard: options.replyMarkup } : undefined,
		});
	}

	/**
	 * Approve chat join request
	 */
	async approveChatJoinRequest(chatId: number, userId: number) {
		return this.callAPI("approveChatJoinRequest", {
			chat_id: chatId,
			user_id: userId,
		});
	}

	/**
	 * Decline chat join request
	 */
	async declineChatJoinRequest(chatId: number, userId: number) {
		return this.callAPI("declineChatJoinRequest", {
			chat_id: chatId,
			user_id: userId,
		});
	}

	/**
	 * Get bot info
	 */
	async getMe() {
		return this.callAPI("getMe");
	}

	/**
	 * Get updates from Telegram (Long Polling)
	 */
	async getUpdates(offset: number = 0) {
		return this.callAPI("getUpdates", {
			offset,
			timeout: 30,
			allowed_updates: ["message", "callback_query", "chat_join_request"],
		}) as Promise<{ ok: boolean; result: UpdateWithId[] }>;
	}

	/**
	 * Start long polling loop
	 */
	async startPolling() {
		console.log("🚀 Starting Long Polling...");
		
		// Clear webhook first to allow polling
		await this.callAPI("deleteWebhook", { drop_pending_updates: true });
		
		let offset = 0;
		while (true) {
			try {
				const response = await this.getUpdates(offset);
				if (response.ok && response.result.length > 0) {
					for (const update of response.result) {
						await this.handleUpdate(update);
						offset = update.update_id + 1;
					}
				}
			} catch (e: any) {
				console.error(`[Polling] Error: ${e.message}`);
				await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
			}
		}
	}

	/**
	 * Handle incoming update
	 */
	async handleUpdate(update: Update) {
		console.log("[Bot] Received update:", JSON.stringify(update, null, 2));

		// Handle join requests
		if (update.chat_join_request) {
			return this.handleJoinRequest(update.chat_join_request);
		}

		// Handle callback queries
		if (update.callback_query) {
			return this.handleCallbackQuery(update.callback_query);
		}

		// Handle messages
		if (update.message) {
			return this.handleMessage(update.message);
		}

		return { ok: true };
	}

	/**
	 * Handle join request
	 */
	private async handleJoinRequest(request: ChatJoinRequest) {
		const userId = String(request.from.id);
		const resourceId = String(request.chat.id);

		console.log(`[Bot] Join request from ${userId} to ${resourceId}`);

		try {
			const hasAccess = await checkAccessQuery({ userId, resourceId });

			if (hasAccess) {
				await this.approveChatJoinRequest(request.chat.id, request.from.id);
				const message = await getFormattedMessageQuery("join_success", {
					durationDays: 30,
				});
				await this.sendMessage(request.from.id, message, { parseMode: "HTML" });
				console.log(`[Bot] Approved join request from ${userId}`);
			} else {
				await this.declineChatJoinRequest(request.chat.id, request.from.id);
				const message = await getFormattedMessageQuery("join_declined");
				await this.sendMessage(request.from.id, message, { parseMode: "HTML" });
				console.log(`[Bot] Declined join request from ${userId}`);
			}
		} catch (error: any) {
			console.error(`[Bot] Error in join request: ${error.message}`);
		}
	}

	/**
	 * Handle callback query
	 */
	private async handleCallbackQuery(query: CallbackQuery) {
		const userId = String(query.from.id);
		const data = query.data;
		const chatId = query.message?.chat.id || query.from.id;
		const messageId = query.message?.message_id;

		console.log(`[Bot] Callback query from ${userId}: ${data}`);

		try {
			// List tariffs
			if (data === "list_tariffs") {
				const plans = await listPlansQuery();
				if (plans.length === 0) {
					await this.editMessageText(
						chatId,
						messageId,
						"😔 Программы обучения временно недоступны.",
					);
					return this.answerCallbackQuery(query.id);
				}

				await this.editMessageText(
					chatId,
					messageId,
					"📦 <b>Выберите подходящий формат участия:</b>",
					{ parseMode: "HTML" },
				);

				for (const plan of plans) {
					const keyboard: InlineKeyboard = [
						[
							{
								text: `💳 Оплатить ${plan.price} ${plan.currency}`,
								callback_data: `pay_${plan.id}`,
							},
						],
					];
					await this.sendMessage(
						chatId,
						`🥇 <b>${plan.name}</b>\n` +
							`⏳ Интенсивность: ${plan.durationDays} дней развития\n` +
							`📢 Сообщество: BigTech Эксперты`,
						{ parseMode: "HTML", replyMarkup: keyboard },
					);
				}
				return this.answerCallbackQuery(query.id);
			}

			// Payment
			if (data.startsWith("pay_")) {
				const planId = data.replace("pay_", "");
				const { subscriptionId, paymentUrl } = await subscribeUserCommand({
					userId,
					planId,
				});
				const keyboard: InlineKeyboard = [
					[
						{
							text: "🔗 Перейти к подтверждению",
							url: paymentUrl,
						},
					],
				];
				await this.sendMessage(
					chatId,
					`✅ <b>Заявка на участие сформирована!</b>\n\n` +
						`Для подтверждения вашего места в Акселераторе перейдите к оплате.\n` +
						`После успешной транзакции система автоматически запустит ваш онбординг.`,
					{ parseMode: "HTML", replyMarkup: keyboard },
				);
				return this.answerCallbackQuery(query.id);
			}

			// My subscription
			if (data === "my_sub") {
				const status = await findSubscriptionByUserIdQuery({ userId });
				if (!status?.subscription || status.subscription.status !== "active") {
					const keyboard: InlineKeyboard = [
						[
							{
								text: "🚀 Выбрать формат участия",
								callback_data: "list_tariffs",
							},
						],
					];
					return this.editMessageText(
						chatId,
						messageId,
						"📅 <b>Ваш статус участия</b>\n\nСтатус: ❌ Доступ не активен",
						{ parseMode: "HTML", replyMarkup: keyboard },
					);
				}

				const sub = status.subscription;
				return this.editMessageText(
					chatId,
					messageId,
					`📅 <b>Ваш статус участия</b>\n\n` +
						`Статус: ✅ Активен\n` +
						`🔑 Сообщество: BigTech Accelerator\n` +
						`⏳ Доступен до: ${sub.expiresAt?.toLocaleDateString()}`,
					{ parseMode: "HTML" },
				);
			}

			// Admin: template menu
			if (data === "admin_tpl_menu") {
				if (query.from.id !== this.adminId) {
					return this.answerCallbackQuery(query.id, "❌ Доступ запрещён");
				}
				const keyboard: InlineKeyboard = [
					[
						{
							text: "💳 Оплата подтверждена",
							callback_data: "edit_tpl_payment_confirmed",
						},
					],
					[
						{
							text: "🚀 Успешный онбординг",
							callback_data: "edit_tpl_join_success",
						},
					],
					[
						{
							text: "❌ Отказ в доступе",
							callback_data: "edit_tpl_join_declined",
						},
					],
					[{ text: "⬅ Назад", callback_data: "admin" }],
				];
				await this.editMessageText(
					chatId,
					messageId,
					"📝 <b>Настройка текстов онбординга</b>\n\nВыберите этап для изменения:",
					{ parseMode: "HTML", replyMarkup: keyboard },
				);
				return this.answerCallbackQuery(query.id);
			}

			// Admin: edit template
			if (data.startsWith("edit_tpl_")) {
				if (query.from.id !== this.adminId) return;
				const key = data.replace("edit_tpl_", "");
				const session = getSession(query.from.id);
				session.editingTemplateKey = key;
				session.step = "awaiting_template_content";

				const currentText = await getFormattedMessageQuery(key as any);
				const keyboard: InlineKeyboard = [
					[{ text: "🔄 Сбросить", callback_data: `reset_tpl_${key}` }],
					[{ text: "❌ Отмена", callback_data: "admin_tpl_menu" }],
				];
				await this.editMessageText(
					chatId,
					messageId,
					`📝 <b>Редактирование этапа:</b> <code>${key}</code>\n\n` +
						`<b>Текущий текст:</b>\n---\n${currentText}\n---\n\n` +
						`📥 <b>Инструкция:</b>\n1. Скопируйте текст.\n2. Отредактируйте (сохраняя {{переменные}}).\n3. Пришлите ответ.\n\n` +
						`<i>HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;.</i>`,
					{ parseMode: "HTML", replyMarkup: keyboard },
				);
				return this.answerCallbackQuery(query.id);
			}

			// Admin: reset template
			if (data.startsWith("reset_tpl_")) {
				if (query.from.id !== this.adminId) return;
				const key = data.replace("reset_tpl_", "");
				await resetTemplateCommand({ key });
				const session = getSession(query.from.id);
				session.step = "idle";
				await this.sendMessage(
					chatId,
					`✅ Этап <code>${key}</code> сброшен до стандарта.`,
					{
						parseMode: "HTML",
					},
				);
				return this.answerCallbackQuery(query.id);
			}

			// Admin: main menu
			if (data === "admin") {
				if (query.from.id !== this.adminId) return;
				const keyboard: InlineKeyboard = [
					[{ text: "➕ Создать продукт", callback_data: "admin_create_plan" }],
					[{ text: "👥 Резиденты", callback_data: "admin_list_subscribers" }],
					[{ text: "📋 Линейка продуктов", callback_data: "admin_list_plans" }],
					[{ text: "📝 Тексты онбординга", callback_data: "admin_tpl_menu" }],
				];
				await this.sendMessage(chatId, "⚙ <b>Управление Акселератором</b>", {
					parseMode: "HTML",
					replyMarkup: keyboard,
				});
				return this.answerCallbackQuery(query.id);
			}

			// Admin: list plans
			if (data === "admin_list_plans") {
				if (query.from.id !== this.adminId) return;
				const plans = await listPlansQuery();
				if (plans.length === 0) {
					await this.sendMessage(chatId, "Продукты еще не созданы.");
					return this.answerCallbackQuery(query.id);
				}

				const botInfo = await this.getMe();
				let message = "📋 <b>Линейка образовательных продуктов:</b>\n\n";
				plans.forEach((p) => {
					const deepLink = `https://t.me/${botInfo.result.username}?start=${p.id}`;
					message += `• <b>${p.name}</b>\n💰 Инвестиция: ${p.price} RUB | ⏳ ${p.durationDays} дн.\n🔗 <code>${deepLink}</code>\n\n`;
				});
				await this.sendMessage(chatId, message, { parseMode: "HTML" });
				return this.answerCallbackQuery(query.id);
			}

			// Admin: list subscribers
			if (data === "admin_list_subscribers") {
				if (query.from.id !== this.adminId) return;
				const subs = await listActiveSubscriptionsQuery();
				if (subs.length === 0) {
					await this.sendMessage(chatId, "Активных резидентов пока нет.");
					return this.answerCallbackQuery(query.id);
				}

				await this.sendMessage(
					chatId,
					`👥 <b>Резиденты акселератора (${subs.length}):</b>`,
					{
						parseMode: "HTML",
					},
				);
				for (const sub of subs) {
					const keyboard: InlineKeyboard = [
						[
							{
								text: "❌ Исключить из клуба",
								callback_data: `admin_revoke_${sub.userId}_${sub.id}`,
							},
						],
					];
					await this.sendMessage(
						chatId,
						`👤 Resident ID: ${sub.userId}\n💳 Продукт ID: ${sub.planId}\n⏳ Доступ до: ${sub.expiresAt?.toLocaleDateString()}`,
						{ parseMode: "HTML", replyMarkup: keyboard },
					);
				}
				return this.answerCallbackQuery(query.id);
			}

			// Admin: revoke access
			if (data.startsWith("admin_revoke_")) {
				if (query.from.id !== this.adminId) return;
				const [, , userId, subscriptionId] = data.split("_");
				await revokeAccessCommand({ userId, subscriptionId });
				await this.sendMessage(
					chatId,
					`✅ Резидент ${userId} успешно исключен из клуба.`,
				);
				return this.answerCallbackQuery(query.id);
			}

			// Unknown callback
			return this.answerCallbackQuery(query.id, "Unknown action");
		} catch (error: any) {
			console.error(`[Bot] Callback query error: ${error.message}`);
			await this.answerCallbackQuery(query.id, `❌ Error: ${error.message}`);
		}
	}

	/**
	 * Handle message
	 */
	private async handleMessage(message: Message) {
		const chatId = message.chat.id;
		const userId = message.from?.id;
		const text = message.text;
		const session = userId ? getSession(userId) : { step: "idle", newPlan: {} };

		if (!text) return { ok: true };

		console.log(`[Bot] Message from ${userId}: ${text}`);

		// Admin: handle template editing
		if (
			userId === this.adminId &&
			session.step === "awaiting_template_content"
		) {
			const key = session.editingTemplateKey!;
			await updateTemplateCommand({ key, content: text });
			session.step = "idle";
			session.editingTemplateKey = undefined;
			await this.sendMessage(chatId, `✅ <b>Текст онбординга обновлен!</b>`, {
				parseMode: "HTML",
			});
			return { ok: true };
		}

		// Admin: handle plan creation flow
		if (userId === this.adminId && session.step !== "idle") {
			switch (session.step) {
				case "awaiting_plan_name":
					session.newPlan.name = text;
					session.step = "awaiting_plan_price";
					await this.sendMessage(
						chatId,
						"Шаг 2/4: Укажите размер инвестиции в RUB:",
					);
					break;
				case "awaiting_plan_price":
					const price = parseInt(text);
					if (isNaN(price)) {
						await this.sendMessage(chatId, "Пожалуйста, введите число.");
						return { ok: true };
					}
					session.newPlan.price = price;
					session.step = "awaiting_plan_duration";
					await this.sendMessage(
						chatId,
						"Шаг 3/4: Укажите период участия (в днях):",
					);
					break;
				case "awaiting_plan_duration":
					const duration = parseInt(text);
					if (isNaN(duration)) {
						await this.sendMessage(chatId, "Пожалуйста, введите число.");
						return { ok: true };
					}
					session.newPlan.duration = duration;
					session.step = "awaiting_plan_channel";
					await this.sendMessage(
						chatId,
						"Шаг 4/4: Введите ID закрытого сообщества:",
					);
					break;
				case "awaiting_plan_channel":
					session.newPlan.channelId = text;
					const result = await createPlanCommand({
						name: session.newPlan.name!,
						price: session.newPlan.price!,
						currency: "RUB",
						durationDays: session.newPlan.duration!,
						channelId: session.newPlan.channelId!,
					});
					const botInfo = await this.getMe();
					const deepLink = `https://t.me/${botInfo.result.username}?start=${result.planId}`;
					session.step = "idle";
					await this.sendMessage(
						chatId,
						`✅ <b>Продукт "${session.newPlan.name}" успешно запущен!</b>\n🔗 Прямая ссылка: <code>${deepLink}</code>`,
						{ parseMode: "HTML" },
					);
					await this.sendMessage(
						chatId,
						`🚀 <b>Готовый пост для привлечения:</b>\n\n<b>Открыт набор в Product Accelerator!</b>\n\nПрограмма "${session.newPlan.name}" даст вам доступ к сообществу на ${session.newPlan.duration} дней.\n💰 Инвестиция: ${session.newPlan.price} RUB`,
						{
							parseMode: "HTML",
							replyMarkup: [[{ text: "💳 Оформить участие", url: deepLink }]],
						},
					);
					break;
			}
			return { ok: true };
		}

		// /start command
		if (text.startsWith("/start")) {
			// Check for deep link (plan ID)
			const args = text.split(" ");
			if (args.length > 1) {
				const match = args[1];
				const planId = match.startsWith("pay_") ? match.replace("pay_", "") : match;
				
				const { findPlanById } = usePorts({ findPlanById: findPlanByIdPort });
				const plan = await findPlanById({ id: planId });

				if (plan) {
					const keyboard: InlineKeyboard = [
						[
							{
								text: `💳 Оплатить ${plan.price} ${plan.currency}`,
								callback_data: `pay_${plan.id}`,
							},
						],
					];
					await this.sendMessage(
						chatId,
						`🥇 <b>Вы выбрали формат: ${plan.name}</b>\n\n` +
							`⏳ Период развития: ${plan.durationDays} дней\n` +
							`💰 Инвестиция: ${plan.price} ${plan.currency}\n\n` +
							`Нажмите кнопку ниже, чтобы начать онбординг в Акселератор:`,
						{ parseMode: "HTML", replyMarkup: keyboard },
					);
					return { ok: true };
				}
			}

			const tmaUrl = process.env.TMA_URL || "https://lvh.me:3000/tma";
			const keyboard: InlineKeyboard = [
				[{ text: "💎 Premium Membership", web_app: { url: tmaUrl } }],
				[
					{ text: "🚀 Участие (Legacy)", callback_data: "list_tariffs" },
					{ text: "📅 Мой статус", callback_data: "my_sub" },
				],
			];
			await this.sendMessage(
				chatId,
				`👋 <b>Приветствую в Product Accelerator!</b>\n\n` +
					`Я ваш персональный проводник в закрытое сообщество Product-менеджеров из BigTech. Здесь мы делимся кейсами, которые не попадают в Medium, и вакансиями, которых нет на рынке.\n\n` +
					`<b>Готовы ускорить свой карьерный трек?</b>`,
				{ parseMode: "HTML", replyMarkup: keyboard },
			);
			return { ok: true };
		}

		// /admin command
		if (text === "/admin") {
			if (userId !== this.adminId) {
				await this.sendMessage(chatId, "❌ Доступ запрещен.");
				return { ok: true };
			}
			const keyboard: InlineKeyboard = [
				[{ text: "➕ Создать продукт", callback_data: "admin_create_plan" }],
				[{ text: "👥 Резиденты", callback_data: "admin_list_subscribers" }],
				[{ text: "📋 Линейка продуктов", callback_data: "admin_list_plans" }],
				[{ text: "📝 Тексты онбординга", callback_data: "admin_tpl_menu" }],
			];
			await this.sendMessage(chatId, "⚙ <b>Управление Акселератором</b>", {
				parseMode: "HTML",
				replyMarkup: keyboard,
			});
			return { ok: true };
		}

		// Unknown command - ignore or echo
		return { ok: true };
	}
}

/**
 * Factory function to create bot instance
 */
export function createPrimaryBot(token: string, adminId: number) {
	return new PrimaryBotAdapter(token, adminId);
}
