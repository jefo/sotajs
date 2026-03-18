import { Bot, Context, InlineKeyboard, session, SessionFlavor } from "grammy";
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
 * Типизация сессии
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

type MyContext = Context & SessionFlavor<SessionData>;

export function createGrammyBot(token: string, adminId: number) {
	const bot = new Bot<MyContext>(token);

	// Инициализация сессии
	bot.use(
		session({ initial: (): SessionData => ({ step: "idle", newPlan: {} }) }),
	);

	// --- Middleware для логирования ---
	bot.use(async (ctx, next) => {
		if (ctx.from) {
			console.log(
				`[GrammY] Update from ${ctx.from.username || ctx.from.id}: ${ctx.message?.text || ctx.callbackQuery?.data}`,
			);
		}
		await next();
	});

	// --- Команда /start ---
	bot.command("start", async (ctx) => {
		const planId = ctx.match;

		if (planId) {
			const { findPlanById } = usePorts({ findPlanById: findPlanByIdPort });
			const plan = await findPlanById({ id: planId });

			if (plan) {
				const keyboard = new InlineKeyboard().text(
					`💳 Оплатить ${plan.price} ${plan.currency}`,
					`pay_${plan.id}`,
				);
				return ctx.reply(
					`🥇 <b>Вы выбрали формат: ${plan.name}</b>\n\n` +
						`⏳ Период развития: ${plan.durationDays} дней\n` +
						`💰 Инвестиция: ${plan.price} ${plan.currency}\n\n` +
						`Нажмите кнопку ниже, чтобы начать онбординг в Акселератор:`,
					{ reply_markup: keyboard, parse_mode: "HTML" },
				);
			}
		}

		const keyboard = new InlineKeyboard()
			.text("🚀 Участие", "list_tariffs")
			.text("📅 Мой статус", "my_sub")
			.row()
			.text("❓ Помощь", "help");

		await ctx.reply(
			`👋 <b>Приветствую в Product Accelerator!</b>\n\n` +
				`Я ваш персональный проводник в закрытое сообщество Product-менеджеров из BigTech. Здесь мы делимся кейсами, которые не попадают в Medium, и вакансиями, которых нет на рынке.\n\n` +
				`<b>Готовы ускорить свой карьерный трек?</b>`,
			{ reply_markup: keyboard, parse_mode: "HTML" },
		);
	});

	// --- Просмотр форматов участия ---
	bot.callbackQuery("list_tariffs", async (ctx) => {
		const plans = await listPlansQuery();
		if (plans.length === 0)
			return ctx.editMessageText("😔 Программы обучения временно недоступны.");

		await ctx.editMessageText("📦 <b>Выберите подходящий формат участия:</b>", {
			parse_mode: "HTML",
		});

		for (const plan of plans) {
			const keyboard = new InlineKeyboard().text(
				`💳 Оплатить ${plan.price} ${plan.currency}`,
				`pay_${plan.id}`,
			);
			await ctx.reply(
				`🥇 <b>${plan.name}</b>\n` +
					`⏳ Интенсивность: ${plan.durationDays} дней развития\n` +
					`📢 Сообщество: BigTech Эксперты`,
				{ reply_markup: keyboard, parse_mode: "HTML" },
			);
		}
		await ctx.answerCallbackQuery();
	});

	// --- Обработка оплаты ---
	bot.on("callback_query:data", async (ctx, next) => {
		const data = ctx.callbackQuery.data;
		if (!data.startsWith("pay_")) return next();

		const planId = data.replace("pay_", "");
		const userId = String(ctx.from.id);

		try {
			const { subscriptionId, paymentUrl } = await subscribeUserCommand({
				userId,
				planId,
			});
			const keyboard = new InlineKeyboard().url(
				"🔗 Перейти к подтверждению",
				paymentUrl,
			);

			await ctx.reply(
				`✅ <b>Заявка на участие сформирована!</b>\n\n` +
					`Для подтверждения вашего места в Акселераторе перейдите к оплате.\n` +
					`После успешной транзакции система автоматически запустит ваш онбординг.`,
				{ reply_markup: keyboard, parse_mode: "HTML" },
			);

			await ctx.answerCallbackQuery();
		} catch (e: any) {
			await ctx.reply(`❌ Ошибка: ${e.message}`);
		}
	});

	// --- Join Requests ---
	bot.on("chat_join_request", async (ctx) => {
		const userId = String(ctx.from.id);
		const resourceId = String(ctx.chat.id);

		try {
			if (await checkAccessQuery({ userId, resourceId })) {
				await ctx.approveChatJoinRequest();
				const message = await getFormattedMessageQuery("join_success", {
					durationDays: 30,
				});
				await bot.api.sendMessage(userId, message, { parse_mode: "HTML" });
			} else {
				await ctx.declineChatJoinRequest();
				const message = await getFormattedMessageQuery("join_declined");
				await bot.api.sendMessage(userId, message, { parse_mode: "HTML" });
			}
		} catch (e: any) {
			console.error(`[GrammY] Error in chat_join_request: ${e.message}`);
		}
	});

	// --- Мой статус ---
	bot.callbackQuery("my_sub", async (ctx) => {
		const userId = String(ctx.from.id);
		const status = await findSubscriptionByUserIdQuery({ userId });

		if (
			!status ||
			!status.subscription ||
			status.subscription.status !== "active"
		) {
			return ctx.editMessageText(
				"📅 <b>Ваш статус участия</b>\n\nСтатус: ❌ Доступ не активен",
				{
					reply_markup: new InlineKeyboard().text(
						"🚀 Выбрать формат участия",
						"list_tariffs",
					),
					parse_mode: "HTML",
				},
			);
		}

		const sub = status.subscription;
		await ctx.editMessageText(
			`📅 <b>Ваш статус участия</b>\n\n` +
				`Статус: ✅ Активен\n` +
				`🔑 Сообщество: BigTech Accelerator\n` +
				`⏳ Доступен до: ${sub.expiresAt?.toLocaleDateString()}`,
			{ parse_mode: "HTML" },
		);
		await ctx.answerCallbackQuery();
	});

	// --- АДМИНКА ---
	bot.command("admin", async (ctx) => {
		if (ctx.from?.id !== adminId) return ctx.reply("❌ Доступ запрещен.");
		const keyboard = new InlineKeyboard()
			.text("➕ Создать продукт", "admin_create_plan")
			.text("👥 Резиденты", "admin_list_subscribers")
			.row()
			.text("📋 Линейка продуктов", "admin_list_plans")
			.text("📝 Тексты онбординга", "admin_tpl_menu");

		await ctx.reply("⚙ <b>Управление Акселератором</b>", {
			reply_markup: keyboard,
			parse_mode: "HTML",
		});
	});

	bot.callbackQuery("admin_tpl_menu", async (ctx) => {
		if (ctx.from?.id !== adminId) return;
		const keyboard = new InlineKeyboard()
			.text("💳 Оплата подтверждена", "edit_tpl_payment_confirmed")
			.row()
			.text("🚀 Успешный онбординг", "edit_tpl_join_success")
			.row()
			.text("❌ Отказ в доступе", "edit_tpl_join_declined")
			.row()
			.text("⬅ Назад", "admin");

		await ctx.editMessageText(
			"📝 <b>Настройка текстов онбординга</b>\n\nВыберите этап для изменения:",
			{ reply_markup: keyboard, parse_mode: "HTML" },
		);
		await ctx.answerCallbackQuery();
	});

	bot.on("callback_query:data", async (ctx, next) => {
		const data = ctx.callbackQuery.data;
		if (!data.startsWith("edit_tpl_")) return next();
		if (ctx.from?.id !== adminId) return;

		const key = data.replace("edit_tpl_", "");
		ctx.session.editingTemplateKey = key;
		ctx.session.step = "awaiting_template_content";

		const currentText = await getFormattedMessageQuery(key as any);
		const keyboard = new InlineKeyboard()
			.text("🔄 Сбросить", `reset_tpl_${key}`)
			.text("❌ Отмена", "admin_tpl_menu");

		await ctx.editMessageText(
			`📝 <b>Редактирование этапа:</b> <code>${key}</code>\n\n` +
				`<b>Текущий текст:</b>\n---\n${currentText}\n---\n\n` +
				`📥 <b>Инструкция:</b>\n1. Скопируйте текст.\n2. Отредактируйте (сохраняя {{переменные}}).\n3. Пришлите ответ.\n\n` +
				`<i>HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;.</i>`,
			{ reply_markup: keyboard, parse_mode: "HTML" },
		);
		await ctx.answerCallbackQuery();
	});

	bot.on("callback_query:data", async (ctx, next) => {
		const data = ctx.callbackQuery.data;
		if (!data.startsWith("reset_tpl_")) return next();
		if (ctx.from?.id !== adminId) return;

		const key = data.replace("reset_tpl_", "");
		await resetTemplateCommand({ key });
		ctx.session.step = "idle";
		await ctx.reply(`✅ Этап <code>${key}</code> сброшен до стандарта.`, {
			parse_mode: "HTML",
		});
		await ctx.answerCallbackQuery();
	});

	bot.callbackQuery("admin_list_plans", async (ctx) => {
		if (ctx.from?.id !== adminId) return;
		const plans = await listPlansQuery();
		if (plans.length === 0) return ctx.reply("Продукты еще не созданы.");

		const botInfo = await bot.api.getMe();
		let message = "📋 <b>Линейка образовательных продуктов:</b>\n\n";
		plans.forEach((p) => {
			const deepLink = `https://t.me/${botInfo.username}?start=${p.id}`;
			message += `• <b>${p.name}</b>\n💰 Инвестиция: ${p.price} RUB | ⏳ ${p.durationDays} дн.\n🔗 <code>${deepLink}</code> \n\n`;
		});
		await ctx.reply(message, { parse_mode: "HTML" });
		await ctx.answerCallbackQuery();
	});

	bot.callbackQuery("admin_list_subscribers", async (ctx) => {
		if (ctx.from?.id !== adminId) return;
		const subs = await listActiveSubscriptionsQuery();
		if (subs.length === 0) return ctx.reply("Активных резидентов пока нет.");

		await ctx.reply(`👥 <b>Резиденты акселератора (${subs.length}):</b>`, {
			parse_mode: "HTML",
		});
		for (const sub of subs) {
			const keyboard = new InlineKeyboard().text(
				"❌ Исключить из клуба",
				`admin_revoke_${sub.userId}_${sub.id}`,
			);
			await ctx.reply(
				`👤 Resident ID: ${sub.userId}\n💳 Продукт ID: ${sub.planId}\n⏳ Доступ до: ${sub.expiresAt?.toLocaleDateString()}`,
				{ reply_markup: keyboard, parse_mode: "HTML" },
			);
		}
		await ctx.answerCallbackQuery();
	});

	bot.on("callback_query:data", async (ctx, next) => {
		const data = ctx.callbackQuery.data;
		if (!data.startsWith("admin_revoke_")) return next();
		if (ctx.from?.id !== adminId) return;
		const [, , userId, subscriptionId] = data.split("_");
		try {
			await revokeAccessCommand({ userId, subscriptionId });
			await ctx.reply(`✅ Резидент ${userId} успешно исключен из клуба.`);
			await ctx.answerCallbackQuery();
		} catch (e: any) {
			await ctx.reply(`❌ Ошибка при исключении: ${e.message}`);
		}
	});

	bot.on("message:text", async (ctx, next) => {
		if (ctx.from?.id !== adminId || ctx.session.step === "idle") return next();

		if (ctx.session.step === "awaiting_template_content") {
			const key = ctx.session.editingTemplateKey!;
			await updateTemplateCommand({ key, content: ctx.message.text });
			ctx.session.step = "idle";
			ctx.session.editingTemplateKey = undefined;
			await ctx.reply(`✅ <b>Текст онбординга обновлен!</b>`, {
				parse_mode: "HTML",
			});
			return;
		}

		switch (ctx.session.step) {
			case "awaiting_plan_name":
				ctx.session.newPlan.name = ctx.message.text;
				ctx.session.step = "awaiting_plan_price";
				await ctx.reply("Шаг 2/4: Укажите размер инвестиции в RUB:");
				break;
			case "awaiting_plan_price":
				const price = parseInt(ctx.message.text);
				if (isNaN(price)) return ctx.reply("Пожалуйста, введите число.");
				ctx.session.newPlan.price = price;
				ctx.session.step = "awaiting_plan_duration";
				await ctx.reply("Шаг 3/4: Укажите период участия (в днях):");
				break;
			case "awaiting_plan_duration":
				const duration = parseInt(ctx.message.text);
				if (isNaN(duration)) return ctx.reply("Пожалуйста, введите число.");
				ctx.session.newPlan.duration = duration;
				ctx.session.step = "awaiting_plan_channel";
				await ctx.reply("Шаг 4/4: Введите ID закрытого сообщества:");
				break;
			case "awaiting_plan_channel":
				ctx.session.newPlan.channelId = ctx.message.text;
				const result = await createPlanCommand({
					name: ctx.session.newPlan.name!,
					price: ctx.session.newPlan.price!,
					currency: "RUB",
					durationDays: ctx.session.newPlan.duration!,
					channelId: ctx.session.newPlan.channelId!,
				});
				const botInfo = await bot.api.getMe();
				const deepLink = `https://t.me/${botInfo.username}?start=${result.planId}`;
				ctx.session.step = "idle";
				await ctx.reply(
					`✅ <b>Продукт "${ctx.session.newPlan.name}" успешно запущен!</b>\n🔗 Прямая ссылка: <code>${deepLink}</code>`,
					{ parse_mode: "HTML" },
				);
				await ctx.reply(
					`🚀 <b>Готовый пост для привлечения:</b>\n\n<b>Открыт набор в Product Accelerator!</b>\n\nПрограмма "${ctx.session.newPlan.name}" даст вам доступ к сообществу на ${ctx.session.newPlan.duration} дней.\n💰 Инвестиция: ${ctx.session.newPlan.price} RUB`,
					{
						reply_markup: new InlineKeyboard().url(
							"💳 Оформить участие",
							deepLink,
						),
						parse_mode: "HTML",
					},
				);
				break;
		}
	});

	return bot;
}
