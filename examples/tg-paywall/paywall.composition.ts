import Database from "bun:sqlite";
import { defineCore } from "../../lib";
import {
	PlanManagementFeature,
	SubscriptionFeature,
	PaymentFeature,
	TelegramFeature,
	LoggingFeature,
	MessagingFeature,
	DeploymentFeature,
} from "./application";
import {
	SqlitePlanAdapter,
	SqliteSubscriptionAdapter,
	SqliteTemplateAdapter,
	MockPaymentAdapter,
	YookassaPaymentAdapter,
	RobokassaPaymentAdapter,
	ProdamusPaymentAdapter,
	StripePaymentAdapter,
	RealTelegramAdapter,
	ConsoleLoggerAdapter,
	CloudDeploymentAdapter,
	setupNetworkInterceptor,
} from "./infrastructure";

// Если включена симуляция сети - перехватываем fetch
if (process.env.MOCK_NETWORK === "true") {
	setupNetworkInterceptor();
}

export const core = defineCore({
	plans: PlanManagementFeature,
	subscriptions: SubscriptionFeature,
	payment: PaymentFeature,
	telegram: TelegramFeature,
	logging: LoggingFeature,
	messaging: MessagingFeature,
	deployment: DeploymentFeature,
});

// ... (remaining code updated in next turns if needed)

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
 * Платежный адаптер теперь динамический: выбирает реализацию на основе конфига.
 */
class PaymentAdapterWrapper {
	private adapter: any;
	constructor() {
		const provider = process.env.PAYMENT_PROVIDER || "mock";
		
		if (provider === "yookassa") {
			console.log("[DI] Binding YookassaPaymentAdapter");
			this.adapter = new YookassaPaymentAdapter(
				process.env.YOOKASSA_SHOP_ID || "test_123",
				process.env.YOOKASSA_SECRET_KEY || "test_key"
			);
		} else if (provider === "robokassa") {
			console.log("[DI] Binding RobokassaPaymentAdapter");
			this.adapter = new RobokassaPaymentAdapter(
				process.env.ROBOKASSA_LOGIN || "test_login",
				process.env.ROBOKASSA_PASS1 || "test_pass1"
			);
		} else if (provider === "prodamus") {
			console.log("[DI] Binding ProdamusPaymentAdapter");
			this.adapter = new ProdamusPaymentAdapter(
				process.env.PRODAMUS_SHOP_ID || "demo",
				process.env.PRODAMUS_SECRET || "secret"
			);
		} else if (provider === "stripe") {
			console.log("[DI] Binding StripePaymentAdapter");
			this.adapter = new StripePaymentAdapter(
				process.env.STRIPE_SECRET_KEY || "sk_test_123"
			);
		} else {
			console.log("[DI] Binding MockPaymentAdapter");
			this.adapter = new MockPaymentAdapter();
		}
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

class DeploymentAdapterWrapper {
	private adapter: CloudDeploymentAdapter;
	constructor() {
		this.adapter = new CloudDeploymentAdapter();
	}

	async deploy(input: any): Promise<any> {
		return this.adapter.deploy(input);
	}
}

core.bindFeatures(({ plans, subscriptions, payment, telegram, logging, messaging, deployment }) => {
	plans.bind(PlanAdapterWrapper);
	subscriptions.bind(SubscriptionAdapterWrapper);
	payment.bind(PaymentAdapterWrapper);
	telegram.bind(TelegramAdapterWrapper);
	logging.bind(LoggerAdapterWrapper);
	messaging.bind(TemplateAdapterWrapper);
	deployment.bind(DeploymentAdapterWrapper);
});
