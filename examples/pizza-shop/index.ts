import { defineCore, resetDI } from "../../lib";
import { PizzaShopFeature, ConsolePizzaAdapter, TelegramPizzaAdapter, BaseInMemoryStore } from "./infrastructure/pizza.adapters";
import { createOrderCommand, cancelOrderCommand } from "./application/pizza.commands";

async function runPizzaDemo() {
  console.log("🍕 SotaJS Pizza Shop Demo (Correct Architecture)\n");

  // --- Платформа 1: КОНСОЛЬ ---
  console.log("--- Платформа 1: Консольный интерфейс ---");
  resetDI();
  const core1 = defineCore({ shop: PizzaShopFeature });
  core1.bindFeatures(({ shop }) => {
    shop.bind(ConsolePizzaAdapter); // ПРАВИЛЬНО: Передаем класс
  });

  const { orderId: id1 } = await createOrderCommand({ items: [{ name: "Margarita", price: 500 }] });
  await cancelOrderCommand(id1);

  // --- Платформа 2: ТЕЛЕГРАМ ---
  console.log("\n--- Платформа 2: Переключаемся на Telegram-бота ---");
  resetDI();
  const core2 = defineCore({ shop: PizzaShopFeature });
  core2.bindFeatures(({ shop }) => {
    shop.bind(TelegramPizzaAdapter); // ПРАВИЛЬНО: Передаем класс
  });

  const { orderId: id2 } = await createOrderCommand({ items: [{ name: "Pepperoni", price: 700 }] });
  
  // Имитируем процесс: Пицца уже в печи
  console.log("👨‍🍳 Шеф-повар начал готовить...");
  const store = new BaseInMemoryStore();
  const orderData = await store.findOrderById(id2);
  if (orderData) {
    await store.saveOrder({ ...orderData, status: "cooking" });
  }

  // Попытка отмены
  await cancelOrderCommand(id2);

  console.log("\n🎉 Конец демо: Логика осталась прежней, изменился только адаптер.");
}

runPizzaDemo().catch(console.error);
