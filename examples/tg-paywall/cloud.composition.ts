/**
 * TG Paywall: Cloud Composition Root
 * 
 * Uses Yandex Managed PostgreSQL only.
 * No SQLite dependencies for cloud deployment.
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
	deployment: DeploymentFeature,
});

/**
 * Validate database configuration
 */
if (!process.env.DATABASE_URL) {
	console.warn("⚠️  DATABASE_URL not set. Running in stateless mode.");
}

/**
 * Payment adapter factory
 */
class PaymentAdapterFactory {
	private adapter: any;
	
	constructor() {
		const provider = process.env.PAYMENT_PROVIDER || "mock";
		console.log(`[DI] Payment Provider: ${provider}`);
		
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

// Bind adapters to features
core.bindFeatures(({ plans, subscriptions, payment, telegram, logging, messaging }) => {
	// PostgreSQL adapters (Yandex Managed PostgreSQL)
	plans.bind(YandexPostgresPlanAdapter);
	subscriptions.bind(YandexPostgresSubscriptionAdapter);
	messaging.bind(YandexPostgresTemplateAdapter);
	
	// Dynamic adapters
	payment.bind(PaymentAdapterFactory);
	telegram.bind(TelegramAdapterWrapper);
	logging.bind(LoggerAdapterWrapper);
	
	console.log("[CORE] Cloud features bound successfully");
});
