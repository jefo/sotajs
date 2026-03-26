/**
 * Cloud Function Entry Point - Telegram Bot Handler
 * 
 * This file is designed for Yandex Cloud Functions deployment.
 * Minimal version for testing.
 * 
 * Environment variables required:
 * - BOT_TOKEN: Telegram bot token
 */

// Validate required environment variables
const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN is required for Cloud Function");
}

console.log("🚀 Initializing bot...");

// Import bot
import { Bot, webhookCallback } from "grammy";

const bot = new Bot(token);

// Simple start command
bot.command("start", async (ctx) => {
  await ctx.reply(`👋 Hello! I'm running on Yandex Cloud Functions!`);
});

// Echo handler
bot.on("message:text", async (ctx) => {
  await ctx.reply(`Echo: ${ctx.message.text}`);
});

// Export handler for Yandex Cloud Functions
export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  
  try {
    // Parse the request body
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    
    // Create a mock Request object for grammY
    const request = new Request("https://dummy.local/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    // Use grammY's webhook callback
    const webhookHandler = webhookCallback(bot, "std/http");
    const response = await webhookHandler(request);
    
    return {
      statusCode: response.status,
      body: await response.text(),
    };
  } catch (error: any) {
    console.error("Error handling webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
