/**
 * TG Paywall: Production Deployment Script
 *
 * Деплоит две Cloud Functions:
 * 1. Bot Handler - для Telegram webhook
 * 2. Payment Handler - для платежных webhook'ов
 *
 * Usage:
 * BOT_TOKEN=xxx YC_OAUTH_TOKEN=yyy YC_FOLDER_ID=zzz ADMIN_ID=123 bun run examples/tg-paywall/scripts/deploy.ts
 */

import { resetDI } from "../../../lib";
import { core } from "../../cloud-functions/cloud-functions.composition";
import {
  deployFunctionCommand,
  initCloudCommand,
} from "../../cloud-functions/application/commands";
import { YandexIdentityAdapter } from "../../cloud-functions/infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "../../cloud-functions/infrastructure/adapters/yandex-cloud.adapter";
import { YandexCloudCliAdapter } from "../../cloud-functions/infrastructure/adapters/yandex-cloud-cli.adapter";
import { Bun } from "bun";
import { join } from "path";

async function runDeploy() {
  console.log("🚀 TG Paywall: Production Deployment\n");
  console.log("=".repeat(60));

  // Проверка переменных окружения
  const OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN;
  const FOLDER_ID = process.env.YC_FOLDER_ID;
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const ADMIN_ID = process.env.ADMIN_ID;
  const PAYMENT_SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || "demo_secret_123";

  if (!OAUTH_TOKEN || !FOLDER_ID) {
    console.log("❌ Error: YC_OAUTH_TOKEN and YC_FOLDER_ID are required.");
    console.log("\nExample:");
    console.log("BOT_TOKEN=xxx YC_OAUTH_TOKEN=yyy YC_FOLDER_ID=zzz ADMIN_ID=123 bun run examples/tg-paywall/scripts/deploy.ts\n");
    process.exit(1);
  }

  if (!BOT_TOKEN) {
    console.log("⚠️  Warning: BOT_TOKEN not set. Bot won't be able to connect to Telegram.");
  }

  if (!ADMIN_ID) {
    console.log("⚠️  Warning: ADMIN_ID not set. Admin commands won't work.");
  }

  // Step 0: Инициализация облачного окружения
  console.log("🔧 Step 0: Initializing cloud environment...\n");
  const initResult = await initCloudCommand({
    oauthToken: OAUTH_TOKEN,
    folderId: FOLDER_ID,
    profileName: "tg-paywall-prod",
    auto: true,
  });

  if (!initResult.success) {
    console.log(`\n❌ Initialization failed: ${initResult.error}`);
    process.exit(1);
  }

  // Initialize core with adapters
  resetDI();
  core.bindFeatures(({ cloudFunctions, identity, ycCli }) => {
    identity.bind(
      class extends YandexIdentityAdapter {
        constructor() {
          super("cloud-profiles.sqlite");
        }
      },
    );

    cloudFunctions.bind(
      class extends YandexCloudAdapter {
        constructor() {
          super({
            folderId: FOLDER_ID,
            oauthToken: OAUTH_TOKEN,
          });
        }
      },
    );

    ycCli.bind(YandexCloudCliAdapter);
  });

  const PROFILE_NAME = "tg-paywall-prod";
  const SOURCE_DIR = join(import.meta.dir, "..");

  let botFunctionId: string | null = null;
  let botFunctionUrl: string | null = null;
  let paymentFunctionId: string | null = null;
  let paymentFunctionUrl: string | null = null;

  try {
    // ============================================
    // STEP 1: Deploy Bot Handler
    // ============================================
    console.log("\n☁️  Step 1: Deploying Bot Handler...");
    console.log(`   Name: tg-paywall-bot`);
    console.log(`   Runtime: nodejs18`);
    console.log(`   Memory: 256 MB`);
    console.log(`   Timeout: 10s\n`);

    const botBuildResult = await Bun.build({
      entrypoints: [join(SOURCE_DIR, "handler.ts")],
      target: "node",
      minify: true,
    });

    if (!botBuildResult.success) {
      throw new Error(`Bot build failed: ${JSON.stringify(botBuildResult.logs)}`);
    }

    const botCode = await botBuildResult.outputs[0].text();
    console.log(`📦 Bot bundle size: ${(botCode.length / 1024).toFixed(2)} KB`);

    const botDeployResult = await deployFunctionCommand({
      name: "tg-paywall-bot",
      profileName: PROFILE_NAME,
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 256,
      executionTimeout: 10,
      makePublic: true,
      code: botCode,
      environment: {
        BOT_TOKEN: BOT_TOKEN || "",
        ADMIN_ID: ADMIN_ID || "",
      },
    });

    if (!botDeployResult.success) {
      throw new Error(`Bot deployment failed: ${botDeployResult.error}`);
    }

    botFunctionId = botDeployResult.functionId;
    botFunctionUrl = botDeployResult.url || null;

    console.log(`✅ Bot deployed successfully`);
    console.log(`   Function ID: ${botFunctionId}`);
    console.log(`   Version: ${botDeployResult.version}`);
    if (botFunctionUrl) {
      console.log(`   Public URL: ${botFunctionUrl}`);
    }

    // ============================================
    // STEP 2: Deploy Payment Handler
    // ============================================
    console.log("\n☁️  Step 2: Deploying Payment Handler...");
    console.log(`   Name: tg-paywall-payments`);
    console.log(`   Runtime: nodejs18`);
    console.log(`   Memory: 256 MB`);
    console.log(`   Timeout: 10s\n`);

    const paymentBuildResult = await Bun.build({
      entrypoints: [join(SOURCE_DIR, "payment-handler.ts")],
      target: "node",
      minify: true,
    });

    if (!paymentBuildResult.success) {
      throw new Error(`Payment build failed: ${JSON.stringify(paymentBuildResult.logs)}`);
    }

    const paymentCode = await paymentBuildResult.outputs[0].text();
    console.log(`📦 Payment bundle size: ${(paymentCode.length / 1024).toFixed(2)} KB`);

    const paymentDeployResult = await deployFunctionCommand({
      name: "tg-paywall-payments",
      profileName: PROFILE_NAME,
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 256,
      executionTimeout: 10,
      makePublic: true,
      code: paymentCode,
      environment: {
        PAYMENT_SIGNING_SECRET: PAYMENT_SIGNING_SECRET,
      },
    });

    if (!paymentDeployResult.success) {
      throw new Error(`Payment deployment failed: ${paymentDeployResult.error}`);
    }

    paymentFunctionId = paymentDeployResult.functionId;
    paymentFunctionUrl = paymentDeployResult.url || null;

    console.log(`✅ Payment handler deployed successfully`);
    console.log(`   Function ID: ${paymentFunctionId}`);
    console.log(`   Version: ${paymentDeployResult.version}`);
    if (paymentFunctionUrl) {
      console.log(`   Public URL: ${paymentFunctionUrl}`);
    }

    // ============================================
    // STEP 3: Setup Telegram Webhook
    // ============================================
    console.log("\n🔗 Step 3: Setting up Telegram Webhook...");

    if (BOT_TOKEN && botFunctionUrl) {
      const telegramWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${botFunctionUrl}`;
      
      try {
        const response = await fetch(telegramWebhookUrl);
        const tgResult: any = await response.json();

        if (tgResult.ok) {
          console.log(`✅ Telegram webhook set successfully`);
          console.log(`   Webhook URL: ${botFunctionUrl}`);
        } else {
          console.log(`⚠️  Failed to set Telegram webhook: ${tgResult.description}`);
        }
      } catch (error: any) {
        console.log(`⚠️  Error setting Telegram webhook: ${error.message}`);
      }
    } else {
      console.log("⚠️  Skipping Telegram webhook setup (BOT_TOKEN or function URL missing)");
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\nDeployed Functions:");
    console.log(`  🤖 Bot Handler:`);
    console.log(`     ID: ${botFunctionId}`);
    console.log(`     URL: ${botFunctionUrl || "N/A"}`);
    console.log(`  💳 Payment Handler:`);
    console.log(`     ID: ${paymentFunctionId}`);
    console.log(`     URL: ${paymentFunctionUrl || "N/A"}`);

    if (botFunctionUrl) {
      console.log("\n📱 Next steps:");
      console.log(`  1. Send /start to your bot in Telegram`);
      console.log(`  2. Test payment flow`);
      console.log(`  3. Configure payment provider webhook to: ${paymentFunctionUrl}`);
    }

    console.log("\n✅ All operations completed successfully! 🚀\n");
  } catch (error: any) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ DEPLOYMENT FAILED");
    console.log("=".repeat(60));
    console.log(`\nError: ${error.message}`);
    console.log("\nStack trace:");
    console.log(error.stack);

    process.exit(1);
  }
}

runDeploy().catch(console.error);
