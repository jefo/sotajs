import Database from "bun:sqlite";
import { defineCore } from "../../lib";
import {
	PlanManagementFeature,
	SubscriptionFeature,
	PaymentFeature,
	TelegramFeature,
	LoggingFeature,
	MessagingFeature,
} from "./application";
import {
	SqlitePlanAdapter,
	SqliteSubscriptionAdapter,
	SqliteTemplateAdapter,
	MockPaymentAdapter,
	RealTelegramAdapter,
	ConsoleLoggerAdapter,
} from "./infrastructure";

export const core = defineCore({
	plans: PlanManagementFeature,
	subscriptions: SubscriptionFeature,
	payment: PaymentFeature,
	telegram: TelegramFeature,
	logging: LoggingFeature,
	messaging: MessagingFeature,
});

// Единая база данных для всего приложения
const sqliteDbPath = process.env.SQLITE_PATH || `${import.meta.dir}/paywall.sqlite`;
console.log(`[STORAGE] Using database at: ${sqliteDbPath}`);
const sharedDb = new Database(sqliteDbPath);

/**
 * Обертки адаптеров гарантируют использование единого экземпляра БД 
 * и корректное связывание портов фичи с методами реализации.
 */

class PlanAdapterWrapper {
	private adapter: SqlitePlanAdapter;
	constructor() {
		this.adapter = new SqlitePlanAdapter(sharedDb);
	}

	async savePlan(input: { plan: any }): Promise<void> {
		return this.adapter.savePlan(input);
	}

	async findPlanById(input: { id: string }): Promise<any> {
		return this.adapter.findPlanById(input);
	}

	async findPlanByName(input: { name: string }): Promise<any> {
		return this.adapter.findPlanByName(input);
	}

	async listPlans(): Promise<any[]> {
		return this.adapter.listPlans();
	}
}

class SubscriptionAdapterWrapper {
	private adapter: SqliteSubscriptionAdapter;
	constructor() {
		this.adapter = new SqliteSubscriptionAdapter(sharedDb);
	}

	async saveSubscription(input: { subscription: any }): Promise<void> {
		return this.adapter.saveSubscription(input);
	}

	async updateSubscription(input: { subscription: any }): Promise<void> {
		return this.adapter.updateSubscription(input);
	}

	async findSubscriptionById(input: { id: string }): Promise<any> {
		return this.adapter.findSubscriptionById(input);
	}

	async findSubscriptionsByUserId(input: { userId: string }): Promise<any[]> {
		return this.adapter.findSubscriptionsByUserId(input);
	}

	async listAllSubscriptions(): Promise<any[]> {
		return this.adapter.listAllSubscriptions();
	}

	async findExpiredSubscriptions(input: { now: Date }): Promise<any[]> {
		return this.adapter.findExpiredSubscriptions(input);
	}

	async saveAccessGrant(input: { accessGrant: any }): Promise<void> {
		return this.adapter.saveAccessGrant(input);
	}

	async updateAccessGrant(input: { accessGrant: any }): Promise<void> {
		return this.adapter.updateAccessGrant(input);
	}

	async findAccessGrantBySubscriptionId(input: {
		subscriptionId: string;
	}): Promise<any> {
		return this.adapter.findAccessGrantBySubscriptionId(input);
	}

	async findAccessGrantsByUserId(input: {
		userId: string;
	}): Promise<any[]> {
		return this.adapter.findAccessGrantsByUserId(input);
	}
}

/**
 * Платежный адаптер остается фикстурой (Mock) для удобства тестирования и демо.
 */
class PaymentAdapterWrapper {
	private adapter: MockPaymentAdapter;
	constructor() {
		this.adapter = new MockPaymentAdapter();
	}

	async paymentProvider(input: {
		subscriptionId: string;
		amount: number;
		currency: string;
	}): Promise<{ paymentUrl: string; externalId: string }> {
		return this.adapter.paymentProvider(input);
	}
}

/**
 * Реальный адаптер Telegram для управления доступом.
 */
class TelegramAdapterWrapper {
	private adapter: RealTelegramAdapter;
	constructor() {
		this.adapter = new RealTelegramAdapter(process.env.BOT_TOKEN || "demo_token");
	}

	async grantTelegramAccess(input: {
		userId: string;
		resourceId: string;
	}): Promise<{ inviteLink: string }> {
		return this.adapter.grantTelegramAccess(input);
	}

	async revokeTelegramAccess(input: {
		userId: string;
		resourceId: string;
	}): Promise<void> {
		return this.adapter.revokeTelegramAccess(input);
	}
}

class LoggerAdapterWrapper {
	private adapter: ConsoleLoggerAdapter;
	constructor() {
		this.adapter = new ConsoleLoggerAdapter();
	}

	async logger(input: {
		level: "info" | "warn" | "error";
		message: string;
		context?: Record<string, any>;
	}): Promise<void> {
		return this.adapter.logger(input);
	}
}

class TemplateAdapterWrapper {
	private adapter: SqliteTemplateAdapter;
	constructor() {
		this.adapter = new SqliteTemplateAdapter(sharedDb);
	}

	async getTemplate(input: { key: string }): Promise<any> {
		return this.adapter.getTemplate(input);
	}

	async saveTemplate(input: { key: string; content: string }): Promise<void> {
		return this.adapter.saveTemplate(input);
	}

	async deleteTemplate(input: { key: string }): Promise<void> {
		return this.adapter.deleteTemplate(input);
	}
}

core.bindFeatures(({ plans, subscriptions, payment, telegram, logging, messaging }) => {
	plans.bind(PlanAdapterWrapper);
	subscriptions.bind(SubscriptionAdapterWrapper);
	payment.bind(PaymentAdapterWrapper);
	telegram.bind(TelegramAdapterWrapper);
	logging.bind(LoggerAdapterWrapper);
	messaging.bind(TemplateAdapterWrapper);
});
