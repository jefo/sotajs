import { describe, it, expect, beforeEach } from "bun:test";
import { bot } from "./bot";

/**
 * Архитектурный тест-драйв ТГ-бота
 * 
 * Мы имитируем вызовы команд бота и проверяем логику.
 */

describe("Pizza Bot (Architecture Test)", () => {
  it("должен позволить создать заказ", async () => {
    // 1. Имитируем команду /pizza
    await bot.handleUpdate({
      update_id: 1,
      message: { text: "/pizza", chat: { id: 1, type: "private" }, date: Date.now() }
    } as any);

    // В консоли мы должны увидеть 💾 DB: Order saved.
  });

  it("должен реагировать на /cook и блокировать /cancel (Инвариант)", async () => {
    // 1. Создаем
    await bot.handleUpdate({
      update_id: 2,
      message: { text: "/pizza", chat: { id: 1, type: "private" }, date: Date.now() }
    } as any);

    // 2. В печь
    await bot.handleUpdate({
      update_id: 3,
      message: { text: "/cook", chat: { id: 1, type: "private" }, date: Date.now() }
    } as any);

    // 3. Отмена
    await bot.handleUpdate({
      update_id: 4,
      message: { text: "/cancel", chat: { id: 1, type: "private" }, date: Date.now() }
    } as any);
    
    // В консоли мы должны увидеть 🤖 [TELEGRAM BOT]: 💬 "Уважаемый клиент! ❌ Ошибка отмены: Too late to cancel!"
  });
});
