import { Bot, Context, InlineKeyboard, session, SessionFlavor } from "grammy";
import {
  createPlanCommand,
  subscribeUserCommand,
  confirmPaymentCommand,
  revokeAccessCommand,
  listPlansQuery,
  findSubscriptionByUserIdQuery,
  listActiveSubscriptionsQuery,
} from "../../application";
import { findPlanByIdPort } from "../../application/ports/paywall.ports";
import { usePorts } from "../../../../lib";

/**
 * Типизация сессии (для сложных сценариев, например, создания тарифа)
 */
interface SessionData {
  step: "idle" | "awaiting_plan_name" | "awaiting_plan_price" | "awaiting_plan_duration" | "awaiting_plan_channel";
  newPlan: Partial<{
    name: string;
    price: number;
    duration: number;
    channelId: string;
  }>;
}

type MyContext = Context & SessionFlavor<SessionData>;

export function createGrammyBot(token: string, adminId: number) {
  const bot = new Bot<MyContext>(token);

  // Инициализация сессии
  bot.use(session({ initial: (): SessionData => ({ step: "idle", newPlan: {} }) }));

  // --- Middleware для логирования ---
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      console.log(`[GrammY] Update from ${ctx.from.username || ctx.from.id}: ${ctx.message?.text || ctx.callbackQuery?.data}`);
    }
    await next();
  });

  // --- Команда /start с поддержкой Deep Linking ---
  bot.command("start", async (ctx) => {
    const planId = ctx.match; // ID тарифа из ссылки ?start=ID

    if (planId) {
      const { findPlanById } = usePorts({ findPlanById: findPlanByIdPort });
      const plan = await findPlanById({ id: planId });
      
      if (plan) {
        const keyboard = new InlineKeyboard().text(`💳 Оплатить ${plan.price} ${plan.currency}`, `pay_${plan.id}`);
        return ctx.reply(
          `🥇 **Вы выбрали тариф: ${plan.name}**\n\n` +
          `⏳ Длительность: ${plan.durationDays} дней\n` +
          `💰 Стоимость: ${plan.price} ${plan.currency}\n\n` +
          `Нажмите кнопку ниже для оплаты и получения доступа:`,
          { reply_markup: keyboard, parse_mode: "Markdown" }
        );
      }
    }

    const keyboard = new InlineKeyboard()
      .text("📦 Тарифы", "list_tariffs")
      .text("📅 Моя подписка", "my_sub")
      .row()
      .text("❓ Помощь", "help");

    await ctx.reply(
      `👋 Привет, ${ctx.from?.first_name}! Я бот доступа к закрытым каналам.\n\n` +
      `Выберите действие в меню ниже:`,
      { reply_markup: keyboard }
    );
  });

  // --- Просмотр тарифов (для пользователей) ---
  bot.callbackQuery("list_tariffs", async (ctx) => {
    const plans = await listPlansQuery();
    
    if (plans.length === 0) {
      return ctx.editMessageText("😔 Доступных тарифов пока нет.");
    }

    await ctx.editMessageText("📦 **Выберите подходящий тариф:**", { parse_mode: "Markdown" });

    for (const plan of plans) {
      const keyboard = new InlineKeyboard().text(`💳 Оплатить ${plan.price} ${plan.currency}`, `pay_${plan.id}`);
      await ctx.reply(
        `🥇 **${plan.name}**\n` +
        `⏳ Длительность: ${plan.durationDays} дней\n` +
        `📢 Канал: ${plan.channelId}`,
        { reply_markup: keyboard, parse_mode: "Markdown" }
      );
    }
    await ctx.answerCallbackQuery();
  });

  // --- Обработка оплаты ---
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("pay_")) return next();

    const planId = data.replace("pay_", "");
    const userId = String(ctx.from.id);

    try {
      const { subscriptionId, paymentUrl } = await subscribeUserCommand({ userId, planId });
      
      const keyboard = new InlineKeyboard().url("🔗 Перейти к оплате", paymentUrl);
      
      await ctx.reply(
        `✅ Подписка сформирована!\n\n` +
        `Для активации доступа оплатите счет по ссылке ниже.\n` +
        `После оплаты бот автоматически пришлет вам ссылку на канал.`,
        { reply_markup: keyboard }
      );
      
      // ДЕМО-ХАК: Имитируем подтверждение оплаты через 5 секунд
      setTimeout(async () => {
        const result = await confirmPaymentCommand({ 
          subscriptionId, 
          externalPaymentId: `mock_grammy_${Math.random().toString(36).substr(2, 9)}` 
        });
        
        await bot.api.sendMessage(userId, 
          `🎉 **Оплата подтверждена!**\n\n` +
          `Ваша ссылка для входа: ${result.inviteLink}\n` +
          `Действует до: ${result.expiresAt?.toLocaleDateString()}`,
          { parse_mode: "Markdown" }
        );
      }, 5000);

      await ctx.answerCallbackQuery();
    } catch (e: any) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  });

  // --- Моя подписка ---
  bot.callbackQuery("my_sub", async (ctx) => {
    const userId = String(ctx.from.id);
    const status = await findSubscriptionByUserIdQuery({ userId });

    if (!status || !status.subscription || status.subscription.status !== "active") {
      const keyboard = new InlineKeyboard().text("📦 Посмотреть тарифы", "list_tariffs");
      return ctx.editMessageText(
        "📅 **Ваша подписка**\n\nСтатус: ❌ Не активна",
        { reply_markup: keyboard, parse_mode: "Markdown" }
      );
    }

    const sub = status.subscription;
    await ctx.editMessageText(
      `📅 **Ваша подписка**\n\n` +
      `Статус: ✅ Активна\n` +
      `🔑 Канал: ${status.accessGrant?.resourceId}\n` +
      `⏳ Действует до: ${sub.expiresAt?.toLocaleDateString()}`,
      { parse_mode: "Markdown" }
    );
    await ctx.answerCallbackQuery();
  });

  // --- АДМИНКА ---
  bot.command("admin", async (ctx) => {
    if (ctx.from?.id !== adminId) return ctx.reply("❌ Доступ запрещен.");
    
    const keyboard = new InlineKeyboard()
      .text("➕ Создать тариф", "admin_create_plan")
      .text("👥 Подписчики", "admin_list_subscribers")
      .row()
      .text("📋 Список планов", "admin_list_plans");

    await ctx.reply("⚙️ **Панель администратора**", { reply_markup: keyboard, parse_mode: "Markdown" });
  });

  bot.callbackQuery("admin_create_plan", async (ctx) => {
    if (ctx.from?.id !== adminId) return;
    ctx.session.step = "awaiting_plan_name";
    await ctx.reply("Шаг 1/4: Введите название тарифа (например, VIP):");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("admin_list_plans", async (ctx) => {
    if (ctx.from?.id !== adminId) return;
    const plans = await listPlansQuery();
    
    if (plans.length === 0) {
      return ctx.reply("Тарифов пока нет.");
    }

    let message = "📋 **Список планов:**\n\n";
    plans.forEach(p => {
      message += `• ${p.name}: ${p.price} RUB | ${p.durationDays} дн. | ID: \`${p.id}\` (для ссылок)\n`;
    });

    await ctx.reply(message, { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery();
  });

  // Flow 4: Список подписчиков и ручной отзыв
  bot.callbackQuery("admin_list_subscribers", async (ctx) => {
    if (ctx.from?.id !== adminId) return;
    const subs = await listActiveSubscriptionsQuery();
    
    if (subs.length === 0) {
      return ctx.reply("Активных подписчиков пока нет.");
    }

    await ctx.reply(`👥 **Активные подписчики (${subs.length}):**`, { parse_mode: "Markdown" });

    for (const sub of subs) {
      const keyboard = new InlineKeyboard().text("❌ Отозвать доступ", `admin_revoke_${sub.userId}_${sub.id}`);
      await ctx.reply(
        `👤 User ID: ${sub.userId}\n` +
        `💳 Тариф ID: ${sub.planId}\n` +
        `⏳ Истекает: ${sub.expiresAt?.toLocaleDateString()}`,
        { reply_markup: keyboard, parse_mode: "Markdown" }
      );
    }
    await ctx.answerCallbackQuery();
  });

  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("admin_revoke_")) return next();
    if (ctx.from?.id !== adminId) return;

    const [,, userId, subscriptionId] = data.split("_");
    
    try {
      await revokeAccessCommand({ userId, subscriptionId });
      await ctx.reply(`✅ Доступ для пользователя ${userId} отозван.`);
      await ctx.answerCallbackQuery();
    } catch (e: any) {
      await ctx.reply(`❌ Ошибка при отзыве: ${e.message}`);
    }
  });

  // Простой FSM для создания тарифа
  bot.on("message:text", async (ctx, next) => {
    if (ctx.from?.id !== adminId || ctx.session.step === "idle") return next();

    switch (ctx.session.step) {
      case "awaiting_plan_name":
        ctx.session.newPlan.name = ctx.message.text;
        ctx.session.step = "awaiting_plan_price";
        await ctx.reply("Шаг 2/4: Введите цену в RUB (только число, например 990):");
        break;
      case "awaiting_plan_price":
        const price = parseInt(ctx.message.text);
        if (isNaN(price)) return ctx.reply("Пожалуйста, введите число.");
        ctx.session.newPlan.price = price;
        ctx.session.step = "awaiting_plan_duration";
        await ctx.reply("Шаг 3/4: Введите длительность в днях (например 30):");
        break;
      case "awaiting_plan_duration":
        const duration = parseInt(ctx.message.text);
        if (isNaN(duration)) return ctx.reply("Пожалуйста, введите число.");
        ctx.session.newPlan.duration = duration;
        ctx.session.step = "awaiting_plan_channel";
        await ctx.reply("Шаг 4/4: Введите ID канала (например, -100123456789):");
        break;
      case "awaiting_plan_channel":
        ctx.session.newPlan.channelId = ctx.message.text;
        
        // Вызываем Use Case
        await createPlanCommand({
          name: ctx.session.newPlan.name!,
          price: ctx.session.newPlan.price!,
          currency: "RUB",
          durationDays: ctx.session.newPlan.duration!,
          channelId: ctx.session.newPlan.channelId!,
        });

        ctx.session.step = "idle";
        await ctx.reply(`✅ Тариф "${ctx.session.newPlan.name}" успешно создан и привязан к ${ctx.session.newPlan.channelId}!`);
        break;
    }
  });

  return bot;
}
