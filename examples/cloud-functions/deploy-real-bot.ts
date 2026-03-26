import { saveProfileCommand, deployFunctionCommand } from "./application/commands";

/**
 * SotaJS Cloud: Real Telegram Bot Deployment Script
 * 
 * Использование:
 * BOT_TOKEN=xxx YC_OAUTH_TOKEN=yyy YC_FOLDER_ID=zzz bun run examples/cloud-functions/deploy-real-bot.ts
 */

async function deployBot() {
  const OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN;
  const FOLDER_ID = process.env.YC_FOLDER_ID;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!OAUTH_TOKEN || !FOLDER_ID || !BOT_TOKEN) {
    console.log("❌ Error: Missing credentials.");
    console.log("Set BOT_TOKEN, YC_OAUTH_TOKEN and YC_FOLDER_ID.\n");
    process.exit(1);
  }

  console.log("🚀 SotaJS Cloud: Deploying Real Telegram Bot...\n");

  // 1. Сохраняем профиль
  await saveProfileCommand({
    name: "prod",
    oauthToken: OAUTH_TOKEN,
    folderId: FOLDER_ID
  });

  // 2. Деплоим Эхо-бота на grammY
  const botCode = `
import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN);

bot.command("start", (ctx) => ctx.reply("Welcome! I am running on SotaJS Cloud 🚀"));
bot.on("message", (ctx) => ctx.reply("Echo: " + ctx.message.text));

export const handler = webhookCallback(bot, "std/http");
`;

  const result = await deployFunctionCommand({
    name: "sotajs-echo-bot",
    profileName: "prod",
    runtime: "nodejs18",
    entrypoint: "index.handler",
    memory: 128,
    executionTimeout: 10,
    makePublic: true,
    environment: {
      BOT_TOKEN: BOT_TOKEN
    },
    code: botCode
  });

  if (result.success && result.url) {
    console.log(`✅ Bot deployed to: ${result.url}`);

    // 3. Устанавливаем Webhook в Telegram
    console.log("🔗 Linking Telegram Webhook...");
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${result.url}`;
    
    try {
      const response = await fetch(tgUrl);
      const tgResult: any = await response.json();

      if (tgResult.ok) {
        console.log("🎉 SUCCESS! Your bot is LIVE and linked to the webhook.");
        console.log("\nTry sending a message to your bot in Telegram! 🤖");
      } else {
        console.log(`❌ Failed to set webhook: ${tgResult.description}`);
      }
    } catch (e: any) {
      console.log(`❌ Error linking webhook: ${e.message}`);
    }
  } else {
    console.log(`❌ Deployment failed: ${result.error}`);
  }
}

deployBot().catch(console.error);
