import { Bun } from "bun";
import "../../cloud-functions/cloud-functions.composition"; // Инициализируем движок деплоя
import { deployFunctionCommand } from "../../cloud-functions/application";

/**
 * Deployment Script for TG Paywall
 * 
 * Использует проект @examples/cloud-functions для реального деплоя в Yandex Cloud.
 */
async function runDeploy() {
  console.log("🚀 [DX] Starting REAL cloud deployment using @sotajs/cloud-functions...");

  // Проверка необходимых переменных окружения для Яндекса
  if (!process.env.YC_OAUTH_TOKEN && !process.env.YC_IAM_TOKEN) {
    console.error("❌ [DX] Error: YC_OAUTH_TOKEN or YC_IAM_TOKEN is required for deployment");
    process.exit(1);
  }

  if (!process.env.YC_FOLDER_ID) {
    console.error("❌ [DX] Error: YC_FOLDER_ID is required");
    process.exit(1);
  }

  const buildConfigs = [
    {
      name: "tg-paywall-bot",
      entrypoint: "handler.ts",
      env: {
        BOT_TOKEN: process.env.BOT_TOKEN || "",
        ADMIN_ID: process.env.ADMIN_ID || "",
      }
    },
    {
      name: "tg-paywall-payments",
      entrypoint: "payment-handler.ts",
      env: {
        PAYMENT_SIGNING_SECRET: process.env.PAYMENT_SIGNING_SECRET || "demo_secret_123",
        SQLITE_PATH: "/home/j4jk3wka/Code/sotajs/examples/tg-paywall/paywall.sqlite" // В облаке путь будет другой, но для демо ок
      }
    }
  ];

  for (const config of buildConfigs) {
    console.log(`\n🔨 [DX] Bundling ${config.name}...`);
    
    // 1. Сборка бандла через Bun
    const buildResult = await Bun.build({
      entrypoints: [`${import.meta.dir}/../${config.entrypoint}`],
      target: "node",
      minify: true,
    });

    if (!buildResult.success) {
      console.error(`❌ [DX] Build failed for ${config.name}:`, buildResult.logs);
      continue;
    }

    const bundledCode = await buildResult.outputs[0].text();
    console.log(`📦 [DX] Bundle size: ${(bundledCode.length / 1024).toFixed(2)} KB`);

    // 2. Деплой через проект cloud-functions
    console.log(`☁️  [DX] Sending to Yandex Cloud...`);
    
    const result = await deployFunctionCommand({
      name: config.name,
      runtime: "nodejs18",
      entrypoint: "index.handler", // Т.к. бандл Bun по умолчанию экспортирует в корень
      memory: 256,
      executionTimeout: 10,
      code: bundledCode,
      environment: config.env,
    });

    if (result.success) {
      console.log(`✨ [DX] SUCCESS! ${config.name} is deployed.`);
      console.log(`🆔 [DX] Function ID: ${result.functionId}`);
      console.log(`v. [DX] Version: ${result.version}`);
    } else {
      console.error(`❌ [DX] Deployment failed: ${result.error}`);
    }
  }

  console.log("\n✅ [DX] All deployments finished.");
}

runDeploy().catch(console.error);
