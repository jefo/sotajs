/**
 * TG Paywall Example: Основная точка входа
 * 
 * Если в .env или в окружении есть BOT_TOKEN, запускается реальный бот на grammY.
 * В противном случае запускается консольная симуляция.
 */

import "./paywall.composition";
import { TelegramPaywallBot } from "./infrastructure/adapters/telegram-bot";
import { createGrammyBot } from "./infrastructure/adapters/grammy-bot";

async function run() {
  const token = process.env.BOT_TOKEN;
  const adminId = parseInt(process.env.ADMIN_ID || "0");

  if (token) {
    console.log("🚀 Starting real Telegram Bot (grammY)...");
    const bot = createGrammyBot(token, adminId);
    
    // Запуск бота
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
