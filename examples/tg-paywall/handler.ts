import { webhookCallback } from "grammy";
import "./paywall.composition";
import { createGrammyBot } from "./infrastructure/adapters/grammy-bot";

/**
 * Cloud Function Entry Point
 * 
 * Этот файл предназначен для деплоя в Serverless-среду.
 * Поддерживает Yandex Cloud, AWS Lambda, Google Cloud Functions, Vercel и др.
 */

const token = process.env.BOT_TOKEN;
const adminId = parseInt(process.env.ADMIN_ID || "0");

if (!token) {
  throw new Error("BOT_TOKEN is required for Cloud Function");
}

const bot = createGrammyBot(token, adminId);

// Экспортируем стандартный обработчик для HTTP-вызовов
// grammY автоматически разберет JSON от Telegram и вызовет нужный Use Case
export const handler = webhookCallback(bot, "std/http");
