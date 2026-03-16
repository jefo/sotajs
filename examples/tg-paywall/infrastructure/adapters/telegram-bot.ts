import {
  createPlanCommand,
  subscribeUserCommand,
  confirmPaymentCommand,
  revokeAccessCommand,
  listPlansQuery,
  findSubscriptionByUserIdQuery,
} from "../../application";

/**
 * Telegram Bot Presentation Adapter (Virtual/Simulated)
 * 
 * В реальном приложении здесь был бы код на grammY, 
 * который делает ровно то же самое: вызывает Use Cases.
 */
export class TelegramPaywallBot {
  constructor(private readonly expertId: string) {}

  /**
   * Имитация команды /start
   */
  async handleStart(userId: string) {
    console.log(`\n🤖 Bot [User: ${userId}]: /start`);
    return `👋 Привет! Я бот доступа к каналу.\n\nВыберите действие:\n📦 Тарифы — посмотреть и оплатить\n📅 Моя подписка — статус и продление`;
  }

  /**
   * Имитация команды /tariffs (📦 Тарифы)
   */
  async handleListTariffs() {
    console.log(`\n🤖 Bot: /tariffs`);
    const plans = await listPlansQuery();
    
    if (plans.length === 0) {
      return "😔 К сожалению, сейчас нет доступных тарифов.";
    }

    let message = "📦 Доступные тарифы:\n\n";
    plans.forEach((p, i) => {
      message += `${i + 1}. 🥇 ${p.name}\n`;
      message += `   ⏳ ${p.durationDays} дней | 💰 ${p.price} ${p.currency}\n`;
      message += `   📢 Канал: ${p.channelId}\n\n`;
    });

    return message;
  }

  /**
   * Имитация нажатия на кнопку "Оплатить"
   */
  async handlePay(userId: string, planIndex: number) {
    const plans = await listPlansQuery();
    const plan = plans[planIndex];
    
    if (!plan) return "❌ Тариф не найден.";

    console.log(`\n🤖 Bot [User: ${userId}]: Нажал "Оплатить" -> ${plan.name}`);
    
    const { subscriptionId, paymentUrl } = await subscribeUserCommand({
      userId,
      planId: plan.id,
    });

    return `🔗 Ваша ссылка на оплату:\n${paymentUrl}\n\n(После оплаты подписка активируется автоматически)`;
  }

  /**
   * Имитация /mysub (📅 Моя подписка)
   */
  async handleMySubscription(userId: string) {
    console.log(`\n🤖 Bot [User: ${userId}]: /mysub`);
    const status = await findSubscriptionByUserIdQuery({ userId });

    if (!status || !status.subscription || status.subscription.status !== "active") {
      return "📅 Ваша подписка\n\nСтатус: ❌ Не активна\n\nПолучите доступ к премиум-контенту через /tariffs";
    }

    const sub = status.subscription;
    const daysLeft = sub.expiresAt 
      ? Math.ceil((sub.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return `📅 Ваша подписка\n\nСтатус: ✅ Активна\n🔑 Канал: ${status.accessGrant?.resourceId}\n⏳ Действует до: ${sub.expiresAt?.toLocaleDateString()}\n⏰ Осталось: ${daysLeft} дней`;
  }

  /**
   * Имитация /admin (⚙️ Панель администратора)
   */
  async handleAdmin(userId: string) {
    if (userId !== this.expertId) {
      return "❌ У вас нет прав доступа к этой команде.";
    }

    console.log(`\n🤖 Bot [Admin: ${userId}]: /admin`);
    return `⚙️ Панель администратора\n\n1. ➕ Создать тариф\n2. 👥 Подписчики\n3. 📢 Уведомление`;
  }

  /**
   * Имитация создания тарифа через админку
   */
  async handleAdminCreatePlan(
    adminId: string, 
    data: { name: string; price: number; duration: number; channelId: string }
  ) {
    if (adminId !== this.expertId) return "❌ Доступ запрещен.";

    console.log(`\n🤖 Bot [Admin: ${adminId}]: Создание тарифа ${data.name}`);
    
    await createPlanCommand({
      name: data.name,
      price: data.price,
      currency: "RUB",
      durationDays: data.duration,
      channelId: data.channelId,
    });

    return `✅ Тариф "${data.name}" успешно создан!`;
  }

  /**
   * Имитация внешнего Webhook-а от платежной системы
   */
  async simulatePaymentWebhook(subscriptionId: string) {
    console.log(`\n🌐 Webhook: Оплата получена для ${subscriptionId}`);
    
    const result = await confirmPaymentCommand({
      subscriptionId,
      externalPaymentId: `ext_${Math.random().toString(36).substring(7)}`,
    });

    return {
      userId: "unknown", // В реальности берется из подписки
      message: `✅ Оплата прошла успешно!\n\n🎉 Ваша подписка активирована.\n🔗 Ссылка для входа: ${result.inviteLink}\n⏰ Действует до: ${result.expiresAt?.toLocaleDateString()}`,
    };
  }
}
