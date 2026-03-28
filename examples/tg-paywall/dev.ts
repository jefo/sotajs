/**
 * СИНГЛ-ПОИНТ ДЛЯ РАЗРАБОТКИ (DX)
 * 
 * 1. Long Polling для бота (мгновенная реакция без вебхуков).
 * 2. ngrok только для TMA и уведомлений об оплате.
 * 3. Локальный сервер для приема платежных вебхуков.
 * 4. Запуск демо-платежки и фронтенда.
 */

// ПЕРВОЕ ДЕЛО: Настраиваем переменные окружения ДО любых импортов
process.env.DATABASE_TYPE = "sqlite";
process.env.DATABASE_URL = "file:./paywall.sqlite";
process.env.SQLITE_PATH = "./paywall.sqlite";
process.env.PAYMENT_PROVIDER = "mock";

import { spawn, execSync } from "child_process";
import ngrok from "@ngrok/ngrok";
import * as https from "https";

// Остальные импорты (которые используют DI) мы сделаем динамически внутри start()
let confirmPaymentCommand: any;
let getFormattedMessageQuery: any;
let createPrimaryBot: any;

const TMA_PORT = 3000;
const WEBHOOK_PORT = 4000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID || "0");

if (!BOT_TOKEN) {
	console.error("❌ Ошибка: BOT_TOKEN не найден в .env");
	process.exit(1);
}

async function killPort(port: number) {
	try {
		const cmd = process.platform === "win32"
			? `stop-process -Id (get-nettcpconnection -localport ${port}).owningprocess`
			: `fuser -k ${port}/tcp`;
		execSync(cmd, { stdio: "ignore" });
		await new Promise((resolve) => setTimeout(resolve, 500));
	} catch (e) {}
}

async function start() {
	console.log("🚀 Запуск единой среды разработки...");

	// Динамический импорт композиции и команд ПОСЛЕ настройки окружения
	console.log("📦 Инициализация DI и композиции...");
	await import("./paywall.composition");
	
	const app = await import("./application");
	confirmPaymentCommand = app.confirmPaymentCommand;
	getFormattedMessageQuery = app.getFormattedMessageQuery;
	
	const adapter = await import("./infrastructure/adapters/primary-bot.adapter");
	createPrimaryBot = adapter.createPrimaryBot;

	await killPort(TMA_PORT);
	await killPort(WEBHOOK_PORT);

	try {
		// 1. Тоннель ngrok (один для всего)
		console.log("🌐 Поднимаем ngrok туннель...");
		const listener = await ngrok.connect({ 
			addr: WEBHOOK_PORT, 
			authtoken_from_env: true,
			host_header: "localhost:4000"
		});

		const baseUrl = listener.url();
		const tmaUrl = `${baseUrl}/tma`;
		const paymentWebhookUrl = `${baseUrl}/webhook/payment`;

		process.env.TMA_URL = tmaUrl;

		console.log(`\n✅ Тоннель активен: ${baseUrl}`);
		console.log(`💎 TMA (Mini App): ${tmaUrl}`);
		console.log(`💳 Вебхук оплаты: ${paymentWebhookUrl}\n`);

		// 2. Демо-платежка/TMA (порт 3000)
		console.log("📱 Запуск Demo Payment App...");
		const paymentApp = spawn("bun", ["run", "demo-payment-app.ts"], {
			stdio: "inherit",
			env: { 
				...process.env, 
				PAYMENT_PORT: TMA_PORT.toString(),
				BOT_WEBHOOK_URL: `http://localhost:${WEBHOOK_PORT}/webhook/payment`
			}
		});

		// 3. Бот (Long Polling)
		const bot = createPrimaryBot(BOT_TOKEN, ADMIN_ID);

		// 4. Единый HTTP Сервер (порт 4000) с проксированием для TMA
		Bun.serve({
			port: WEBHOOK_PORT,
			async fetch(req) {
				const url = new URL(req.url);

				// Проксируем запросы TMA на порт 3000
				if (url.pathname === "/tma" || url.pathname.startsWith("/pay/") || url.pathname.startsWith("/api/") || url.pathname.startsWith("/gateway/")) {
					console.log(`[PROXY] -> TMA: ${url.pathname}`);
					const targetUrl = `http://localhost:${TMA_PORT}${url.pathname}${url.search}`;
					return fetch(targetUrl, {
						method: req.method,
						headers: req.headers,
						body: req.method !== "GET" ? await req.blob() : undefined
					});
				}

				// Обработка платежного вебхука
				if (url.pathname === "/webhook/payment" && req.method === "POST") {
					try {
						const body = await req.json();
						console.log(`[PAYMENT] 🔔 Вебхук оплаты: ${body.subscriptionId}`);
						
						const result = await confirmPaymentCommand({
							subscriptionId: body.subscriptionId,
							externalPaymentId: `dev_${Date.now()}`
						});

						if (result.success) {
							const message = await getFormattedMessageQuery("payment_confirmed", {
								expiresAt: result.expiresAt?.toLocaleDateString() || "unknown"
							});
							await bot.sendMessage(Number(result.userId), message, {
								parseMode: "HTML",
								replyMarkup: [[{ text: "➡ Вступить в канал", url: result.inviteLink }]]
							});
						}
						return new Response(JSON.stringify({ ok: true }));
					} catch (e: any) {
						console.error(`[DEV-SERVER] ❌ Ошибка команды: ${e.message}`);
						return new Response(e.message, { status: 400 });
					}
				}
				return new Response("Not Found", { status: 404 });
			}
		});

		console.log("🤖 Бот запущен в режиме Polling");
		bot.startPolling();

		process.on("SIGINT", () => {
			listener.disconnect();
			paymentApp.kill();
			process.exit();
		});
	} catch (error) {
		console.error("❌ Критическая ошибка при запуске:", error);
		process.exit(1);
	}
}

start();
