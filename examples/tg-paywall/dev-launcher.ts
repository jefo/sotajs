import { spawn, execSync } from "child_process";
import ngrok from "@ngrok/ngrok";

const PAYMENT_PORT = 3000;
const BOT_PORT = 4000;

async function killPort(port: number) {
	try {
		const cmd =
			process.platform === "win32"
				? `stop-process -Id (get-nettcpconnection -localport ${port}).owningprocess`
				: `fuser -k ${port}/tcp`;

		execSync(cmd, { stdio: "ignore" });
		await new Promise((resolve) => setTimeout(resolve, 500));
	} catch (e) {
		// Port already free
	}
}

async function startDev() {
	console.log("🛠 Cleaning up ports...");
	await killPort(PAYMENT_PORT);
	await killPort(BOT_PORT);

	console.log("🛠 Starting Development Infrastructure...");

	// 1. Запускаем Платежку/TMA
	const paymentApp = spawn(
		"bun",
		["run", `${import.meta.dir}/demo-payment-app.ts`],
		{
			stdio: "inherit",
			env: { ...process.env, PAYMENT_PORT: PAYMENT_PORT.toString() },
		},
	);

	// 2. Поднимаем ngrok туннель для HTTPS
	console.log("🌐 Starting ngrok tunnel for TMA...");

	let tmaUrl = "";

	try {
		const listener = await ngrok.connect({
			addr: PAYMENT_PORT,
			authtoken_from_env: true,
		});

		tmaUrl = `${listener.url()}/tma`;

		console.log(`\n✅ Tunnel active!`);
		console.log(`💎 TMA URL: ${tmaUrl}`);
		console.log(
			`📡 Bot Webhook: http://localhost:${BOT_PORT}/webhook/payment\n`,
		);

		// 3. Запускаем Telegram Bot
		console.log("🤖 Starting Telegram Bot...");
		const bot = spawn("bun", ["run", `${import.meta.dir}/index.ts`], {
			stdio: "inherit",
			env: {
				...process.env,
				TMA_URL: tmaUrl,
				BOT_WEBHOOK_PORT: BOT_PORT.toString(),
				BOT_WEBHOOK_URL: `http://localhost:${BOT_PORT}/webhook/payment`,
				MOCK_NETWORK: "true",
			},
		});

		process.on("SIGINT", () => {
			console.log("\n👋 Shutting down...");
			listener.disconnect();
			bot.kill();
			paymentApp.kill();
			process.exit();
		});
	} catch (error) {
		console.error("❌ Failed to start ngrok tunnel:", error);
		paymentApp.kill();
		process.exit(1);
	}
}

startDev().catch(console.error);
