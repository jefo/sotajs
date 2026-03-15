import { Bot, Context, session, SessionFlavor } from "grammy";
import { defineCore, resetDI } from "../../../lib";
import { PizzaShopFeature, TelegramPizzaAdapter, BaseInMemoryStore } from "../infrastructure/pizza.adapters";
import { createOrderCommand, cancelOrderCommand } from "../application/pizza.commands";

/**
 * Описываем сессию бота (Стейт-машина диалога)
 */
interface SessionData {
  step: "IDLE" | "WAITING_CONFIRMATION";
  currentOrderId?: string;
}
type MyContext = Context & SessionFlavor<SessionData>;

// Инициализация SotaJS
resetDI();
const core = defineCore({ shop: PizzaShopFeature });

// ПРАВИЛЬНО: Биндим класс-адаптер для Телеграма
core.bindFeatures(({ shop }) => {
  shop.bind(TelegramPizzaAdapter);
});

// Инициализация Бота
const bot = new Bot<MyContext>("FAKE_TOKEN", {
  botInfo: {
    id: 12345,
    is_bot: true,
    first_name: "PizzaBot",
    username: "pizza_shop_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
  },
});

bot.use(session({ initial: () => ({ step: "IDLE" }) }));

/**
 * Команды бота
 */
bot.command("start", async (ctx) => {
  ctx.session.step = "IDLE";
  await ctx.reply("🍕 Добро пожаловать! Введите /pizza для заказа.");
});

bot.command("pizza", async (ctx) => {
  const result = await createOrderCommand({ 
    items: [{ name: "Margarita", price: 500 }] 
  });

  if (result.success) {
    ctx.session.step = "WAITING_CONFIRMATION";
    ctx.session.currentOrderId = result.orderId;
    await ctx.reply(`🛒 Заказ создан! Сумма: ${result.totalPrice} руб.\n/cancel для отмены.`);
  }
});

bot.command("cancel", async (ctx) => {
  if (!ctx.session.currentOrderId) return ctx.reply("❌ Нет активных заказов.");

  const result = await cancelOrderCommand(ctx.session.currentOrderId);

  if (result.success) {
    ctx.session.step = "IDLE";
    delete ctx.session.currentOrderId;
    await ctx.reply("✅ Заказ отменен.");
  } else {
    await ctx.reply(`🚫 Ошибка: ${result.message}`);
  }
});

bot.command("cook", async (ctx) => {
  if (ctx.session.currentOrderId) {
    const store = new BaseInMemoryStore();
    const orderData = await store.findOrderById(ctx.session.currentOrderId);
    if (orderData) {
      await store.saveOrder({ ...orderData, status: "cooking" });
      await ctx.reply("👨‍🍳 В печи! Отмена невозможна.");
    }
  }
});

export { bot };
