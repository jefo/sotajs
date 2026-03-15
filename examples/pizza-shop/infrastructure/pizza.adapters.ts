import { defineFeature, FeaturePorts } from "../../../lib";
import {
	saveOrderPort,
	findOrderByIdPort,
	notifyCustomerPort,
	OrderDto,
} from "./order.ports";

export const PizzaShopFeature = defineFeature({
	saveOrder: saveOrderPort,
	findOrderById: findOrderByIdPort,
	notifyCustomer: notifyCustomerPort,
});

/**
 * Базовый In-Memory адаптер для логики хранения
 */
export class BaseInMemoryStore {
	protected static orders: Map<string, OrderDto> = new Map();

	async saveOrder(order: OrderDto) {
		BaseInMemoryStore.orders.set(order.id, order);
		console.log(`💾 DB: Order ${order.id.slice(0, 8)} saved.`);
	}

	async findOrderById(id: string) {
		return BaseInMemoryStore.orders.get(id) || null;
	}

	static clear() {
		BaseInMemoryStore.orders.clear();
	}

	static getAll() {
		return Array.from(BaseInMemoryStore.orders.values());
	}
}

/**
 * Адаптер для КОНСОЛИ
 */
export class ConsolePizzaAdapter
	extends BaseInMemoryStore
	implements FeaturePorts<typeof PizzaShopFeature>
{
	async notifyCustomer(msg: string) {
		console.log(`\n📺 [CONSOLE NOTIFY]: ${msg}\n`);
	}
}

/**
 * Адаптер для ТЕЛЕГРАМА
 */
export class TelegramPizzaAdapter
	extends BaseInMemoryStore
	implements FeaturePorts<typeof PizzaShopFeature>
{
	async notifyCustomer(msg: string) {
		console.log(`\n🤖 [TELEGRAM BOT]: 💬 "Уважаемый клиент! ${msg}"\n`);
	}
}
