/**
 * Cloud Function Entry Point - Minimal Telegram Bot
 * 
 * No external dependencies - pure HTTP handling for Yandex Cloud Functions
 * Fast cold start (<1s)
 * 
 * Environment variables required:
 * - BOT_TOKEN: Telegram bot token
 */

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required");
}

console.log("🚀 Bot initialized");

/**
 * Call Telegram API
 */
async function callTelegram(method: string, params: Record<string, any>) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  
  return response.json();
}

/**
 * Send message to Telegram
 */
async function sendMessage(chatId: number, text: string, parseMode?: string) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode,
  });
}

/**
 * Handle Telegram webhook
 */
async function handleWebhook(update: any) {
  console.log("Received update:", JSON.stringify(update, null, 2));
  
  // Handle message
  if (update.message) {
    const chatId = update.message.chat.id;
    const userId = update.message.from?.id;
    const text = update.message.text;
    
    console.log(`Message from ${userId}: ${text}`);
    
    if (text === "/start") {
      return sendMessage(
        chatId,
        `👋 <b>Hello!</b> I'm a minimal bot running on <b>Yandex Cloud Functions</b>!\n\n` +
        `I'm built with pure JavaScript (no frameworks) for maximum performance.\n\n` +
        `Try sending me any message and I'll echo it back!`,
        "HTML"
      );
    }
    
    if (text === "/help") {
      return sendMessage(
        chatId,
        `📖 <b>Available commands:</b>\n\n` +
        `/start - Start the bot\n` +
        `/help - Show this help message\n\n` +
        `Or just send me any text and I'll echo it back!`
      );
    }
    
    // Echo with uppercase option
    if (text.startsWith("/upper ")) {
      const message = text.slice(7);
      return sendMessage(chatId, message.toUpperCase());
    }
    
    // Simple echo
    return sendMessage(chatId, `🔊 Echo: ${text}`);
  }
  
  // Handle callback queries
  if (update.callback_query) {
    const callbackId = update.callback_query.id;
    return callTelegram("answerCallbackQuery", {
      callback_query_id: callbackId,
      text: "Thanks for your click!",
    });
  }
  
  return { ok: true };
}

/**
 * Yandex Cloud Functions handler
 */
export const handler = async (event: any) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  
  try {
    // Parse body
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    
    // Handle webhook
    const result = await handleWebhook(body);
    
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
