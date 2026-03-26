/**
 * Cloud Function Entry Point - Primary Bot Adapter
 * 
 * Uses framework-free PrimaryBotAdapter for maximum performance.
 * Full business logic without grammY overhead.
 * 
 * Environment variables:
 * - BOT_TOKEN: Telegram bot token
 * - ADMIN_ID: Admin user ID
 */

import { createPrimaryBot } from "./infrastructure/adapters/primary-bot.adapter";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID || "0");

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required");
}

console.log("🚀 Primary Bot initialized");
console.log(`   Admin ID: ${ADMIN_ID}`);

// Create bot instance
const bot = createPrimaryBot(BOT_TOKEN, ADMIN_ID);

/**
 * Yandex Cloud Functions handler
 */
export const handler = async (event: any) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  try {
    // Parse body
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    
    // Handle update with primary adapter
    const result = await bot.handleUpdate(body);
    
    console.log("Result:", result);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error: any) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
