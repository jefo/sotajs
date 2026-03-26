#!/usr/bin/env bun
/**
 * Setup Telegram Webhook for deployed Cloud Function
 *
 * Usage:
 *   BOT_TOKEN=xxx YC_OAUTH_TOKEN=yyy YC_FOLDER_ID=zzz bun run setup-webhook.ts
 */

import { resetDI } from "../../lib";
import { core } from "../cloud-functions/cloud-functions.composition";
import { listFunctionsQuery } from "../cloud-functions/application/queries";
import { YandexIdentityAdapter } from "../cloud-functions/infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "../cloud-functions/infrastructure/adapters/yandex-cloud.adapter";
import { YandexCloudCliAdapter } from "../cloud-functions/infrastructure/adapters/yandex-cloud-cli.adapter";

async function main() {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const YC_OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN;
  const YC_FOLDER_ID = process.env.YC_FOLDER_ID;
  
  console.log("🔗 Telegram Webhook Setup\n");
  console.log("=".repeat(50));
  
  if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN not set");
    process.exit(1);
  }
  
  if (!YC_OAUTH_TOKEN || !YC_FOLDER_ID) {
    console.error("❌ YC_OAUTH_TOKEN and YC_FOLDER_ID required");
    process.exit(1);
  }
  
  // Initialize core
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
            folderId: YC_FOLDER_ID,
            oauthToken: YC_OAUTH_TOKEN,
          });
        }
      },
    );
    
    ycCli.bind(YandexCloudCliAdapter);
  });
  
  // List functions to find the bot
  console.log("🔍 Looking for bot function...");
  const listResult = await listFunctionsQuery({ profileName: "default" });
  
  console.log(`   Found ${listResult.totalCount} function(s)`);
  
  // Find bot function (by name pattern)
  const botFunction = listResult.functions.find(f => 
    f.name.includes("bot") || f.name.includes("tg-paywall")
  );
  
  if (!botFunction) {
    console.error("❌ Bot function not found!");
    console.log("\n💡 Deploy the bot first:");
    console.log("   bun run ../cloud-functions/sota-deploy.ts --function=bot");
    process.exit(1);
  }
  
  console.log(`✅ Found: ${botFunction.name}`);
  console.log(`   ID: ${botFunction.id}`);
  console.log(`   Status: ${botFunction.status}`);
  
  // Use correct Yandex Cloud Functions URL format
  const functionUrl = `https://functions.yandexcloud.net/${botFunction.id}`;
  console.log(`   URL: ${functionUrl}`);
  console.log();
  
  // Setup webhook
  console.log("🔗 Setting up Telegram webhook...");
  const webhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${functionUrl}`;
  
  try {
    const response = await fetch(webhookUrl);
    const result: any = await response.json();
    
    if (result.ok) {
      console.log("✅ Telegram webhook configured successfully!");
      console.log(`   Webhook URL: ${functionUrl}`);
      console.log();
      
      // Verify webhook info
      console.log("📋 Webhook info:");
      const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const infoResult: any = await infoResponse.json();
      
      if (infoResult.ok) {
        const info = infoResult.result;
        console.log(`   URL: ${info.url}`);
        console.log(`   Has custom certificate: ${info.has_custom_certificate}`);
        console.log(`   Pending update count: ${info.pending_update_count}`);
        
        if (info.last_error_date) {
          console.log(`   ⚠️  Last error: ${info.last_error_message}`);
        }
        
        if (info.last_synchronization_error_date) {
          console.log(`   ⚠️  Last sync error: ${info.last_synchronization_error_date}`);
        }
      }
      
      console.log("\n🎉 Done! Your bot is now connected to the cloud function.");
      console.log("   Send /start to your bot in Telegram to test it.");
    } else {
      console.error(`❌ Failed to set webhook: ${result.description}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
  
  console.log();
}

main().catch(console.error);
