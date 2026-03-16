import { defineCore } from "../../lib";
import {
	PlanManagementFeature,
	SubscriptionFeature,
	PaymentFeature,
	TelegramFeature,
	LoggingFeature,
} from "./application";
import {
	SqlitePlanAdapter,
	SqliteSubscriptionAdapter,
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
});

// Для демо используем in-memory базу, для production можно указать путь к файлу
const sqliteDbPath = process.env.SQLITE_PATH || ":memory:";

// Создаем фабрики для адаптеров, которые принимают параметры
const createPlanAdapter = () => new SqlitePlanAdapter(sqliteDbPath);
const createSubscriptionAdapter = () =>
	new SqliteSubscriptionAdapter(sqliteDbPath);
const createPaymentAdapter = () => new MockPaymentAdapter();
const createTelegramAdapter = () =>
	new RealTelegramAdapter(process.env.BOT_TOKEN || "demo_token");
const createLoggerAdapter = () => new ConsoleLoggerAdapter();

// Обертка для адаптеров, чтобы они выглядели как классы для bind
class PlanAdapterWrapper {
	private adapter: SqlitePlanAdapter;
	constructor() {
		this.adapter = createPlanAdapter();
	}

	async savePlan(input: { plan: any }): Promise<void> {
		return this.adapter.savePlan(input);
	}

	async findPlanById(input: { id: string }): Promise<any> {
		return this.adapter.findPlanById(input);
	}

	async listPlans(): Promise<any[]> {
		return this.adapter.listPlans();
	}
}

class SubscriptionAdapterWrapper {
	private adapter: SqliteSubscriptionAdapter;
	constructor() {
		this.adapter = createSubscriptionAdapter();
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
}

class PaymentAdapterWrapper {
	private adapter: MockPaymentAdapter;
	constructor() {
		this.adapter = createPaymentAdapter();
	}

	async paymentProvider(input: {
		subscriptionId: string;
		amount: number;
		currency: string;
	}): Promise<{ paymentUrl: string; externalId: string }> {
		return this.adapter.paymentProvider(input);
	}
}

class TelegramAdapterWrapper {
	private adapter: RealTelegramAdapter;
	constructor() {
		this.adapter = createTelegramAdapter();
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
		this.adapter = createLoggerAdapter();
	}

	async logger(input: {
		level: "info" | "warn" | "error";
		message: string;
		context?: Record<string, any>;
	}): Promise<void> {
		return this.adapter.logger(input);
	}
}

core.bindFeatures(({ plans, subscriptions, payment, telegram, logging }) => {
	plans.bind(PlanAdapterWrapper);
	subscriptions.bind(SubscriptionAdapterWrapper);
	payment.bind(PaymentAdapterWrapper);
	telegram.bind(TelegramAdapterWrapper);
	logging.bind(LoggerAdapterWrapper);
});
