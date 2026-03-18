/**
 * TG Paywall Example: Основная точка входа
 * 
 * Если в .env или в окружении есть BOT_TOKEN, запускается реальный бот на grammY.
 * В противном случае запускается консольная симуляция.
 */

import "./paywall.composition";
import { TelegramPaywallBot } from "./infrastructure/adapters/telegram-bot";
import { createGrammyBot } from "./infrastructure/adapters/grammy-bot";
import { confirmPaymentCommand, getFormattedMessageQuery } from "./application";
import { InlineKeyboard } from "grammy";

async function run() {
  const token = process.env.BOT_TOKEN;
  const adminId = parseInt(process.env.ADMIN_ID || "0");
  const webhookPort = process.env.BOT_WEBHOOK_PORT || 4000;

  if (token) {
    console.log("🚀 Starting real Telegram Bot (grammY)...");
    const bot = createGrammyBot(token, adminId);
    const SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || "demo_secret_123";

    // Функция проверки подписи
    const verifySignature = (subId: string, sig: string | null) => {
      const expected = Buffer.from(`${subId}:${SIGNING_SECRET}`).toString("base64");
      return sig === expected;
    };
    
    // Запуск HTTP-сервера для приема вебхуков прямо внутри процесса бота
    Bun.serve({
      port: Number(webhookPort),
      async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/webhook/payment" && req.method === "POST") {
          try {
            const body = await req.json();
            console.log(`[BOT-SERVER] 🔔 Received webhook:`, JSON.stringify(body, null, 2));

            let subscriptionId: string | undefined;

            // Логика определения формата (ЮKassa vs Наша Демо-платежка)
            if (body.event === "payment.succeeded") {
              // Формат ЮKassa
              subscriptionId = body.object?.metadata?.subscriptionId;
            } else {
              // Наш упрощенный формат или проверка подписи
              const signature = req.headers.get("X-Signature");
              if (verifySignature(body.subscriptionId, signature)) {
                subscriptionId = body.subscriptionId;
              }
            }
            
            if (!subscriptionId) {
              console.warn(`[BOT-SERVER] ❌ Could not determine subscriptionId or invalid signature`);
              return new Response("Invalid payload", { status: 400 });
            }

            const result = await confirmPaymentCommand({
              subscriptionId,
              externalPaymentId: body.object?.id || `webhook_${Date.now()}`
            });

            if (result.success) {
              const message = await getFormattedMessageQuery("payment_confirmed", {
                expiresAt: result.expiresAt?.toLocaleDateString() || "unknown"
              });

              await bot.api.sendMessage(result.userId, message, {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().url("➡ Вступить в канал", result.inviteLink)
              });
              console.log(`[BOT-SERVER] ✅ User ${result.userId} notified about payment`);
            }
            
            return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
          } catch (e: any) {
            console.error(`[BOT-SERVER] ❌ Error processing webhook: ${e.message}`);
            return new Response(e.message, { status: 400 });
          }
        }
        return new Response("Not Found", { status: 404 });
      }
    });

    console.log(`📡 Bot Webhook Server listening on port ${webhookPort}`);
    
    // Запуск бота (long polling)
    bot.start({
      onStart: (info) => console.log(`✅ Bot @${info.username} is running!`),
    });
    
    // Поддержка Graceful Shutdown
    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());
  } else {
    console.log("⚠️  BOT_TOKEN not found. Running local simulation...\n");
    await runSimulation();
  }
}

async function runSimulation() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║      🚀 TG PAYWALL BOT SIMULATION          ║");
  console.log("╚════════════════════════════════════════════╝");

  const expertId = "expert_user_1";
  const bot = new TelegramPaywallBot(expertId);
  const subscriberId = "ordinary_joe_77";

  // 1. Создаем тарифы
  await bot.handleAdminCreatePlan(expertId, {
    name: "🥇 Premium",
    price: 990,
    duration: 30,
    channelId: "@expert_channel"
  });

  // 2. Юзер заходит в бот
  console.log(await bot.handleStart(subscriberId));
  console.log(await bot.handleListTariffs());

  // 3. Юзер платит
  const paymentMsg = await bot.handlePay(subscriberId, 0);
  console.log(paymentMsg);

  const subIdMatch = paymentMsg.match(/pay\/(.+?)\n/);
  const subscriptionId = subIdMatch ? subIdMatch[1] : "";

  // 4. Вебхук
  if (subscriptionId) {
    const webhookResponse = await bot.simulatePaymentWebhook(subscriptionId);
    console.log(`\n📱 Notification to User [${subscriberId}]:`);
    console.log(webhookResponse.message);
  }

  // 5. Проверка статуса
  console.log(await bot.handleMySubscription(subscriberId));

  console.log("\n✅ Simulation completed. Set BOT_TOKEN to run a real bot.");
}

if (import.meta.main) {
  run().catch(console.error);
}
