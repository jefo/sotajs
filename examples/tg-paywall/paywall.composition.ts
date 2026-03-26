/**
 * TG Paywall: Composition Root
 * 
 * Uses Yandex Managed PostgreSQL for cloud deployment.
 * For local development, set DATABASE_TYPE=sqlite and DATABASE_URL=file:./paywall.sqlite
 */

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
	YandexPostgresPlanAdapter,
	YandexPostgresSubscriptionAdapter,
	YandexPostgresTemplateAdapter,
	MockPaymentAdapter,
	YookassaPaymentAdapter,
	RobokassaPaymentAdapter,
	ProdamusPaymentAdapter,
	StripePaymentAdapter,
	RealTelegramAdapter,
	ConsoleLoggerAdapter,
	CloudDeploymentAdapter,
} from "./infrastructure";

// Если включена симуляция сети - перехватываем fetch
if (process.env.MOCK_NETWORK === "true") {
	// setupNetworkInterceptor();
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

/**
 * Validate database configuration
 */
const databaseType = process.env.DATABASE_TYPE || "postgres";
const databaseUrl = process.env.DATABASE_URL;

if (databaseType === "postgres" && !databaseUrl) {
	console.warn("⚠️  DATABASE_URL not set. Running in stateless mode.");
}

/**
 * Payment adapter factory
 */
class PaymentAdapterFactory {
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
 * Real Telegram adapter for access management
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

/**
 * Console logger adapter
 */
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

/**
 * Deployment adapter wrapper
 */
class DeploymentAdapterWrapper {
	private adapter: CloudDeploymentAdapter;
	
	constructor() {
		this.adapter = new CloudDeploymentAdapter();
	}

	async deploy(input: any): Promise<any> {
		return this.adapter.deploy(input);
	}
}

// Bind adapters to features
core.bindFeatures(({ plans, subscriptions, payment, telegram, logging, messaging, deployment }) => {
	// PostgreSQL adapters (Yandex Managed PostgreSQL)
	plans.bind(YandexPostgresPlanAdapter);
	subscriptions.bind(YandexPostgresSubscriptionAdapter);
	messaging.bind(YandexPostgresTemplateAdapter);
	
	// Dynamic adapters
	payment.bind(PaymentAdapterFactory);
	telegram.bind(TelegramAdapterWrapper);
	logging.bind(LoggerAdapterWrapper);
	deployment.bind(DeploymentAdapterWrapper);
	
	console.log("[CORE] Features bound successfully");
	console.log(`   Database: ${databaseType}${databaseUrl ? ` (${databaseUrl.split('@').pop()})` : " (stateless)"}`);
	console.log(`   Payment Provider: ${process.env.PAYMENT_PROVIDER || "mock"}`);
});
