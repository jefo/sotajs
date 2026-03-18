import { describe, it, expect, beforeEach } from "bun:test";
import { resetDI, defineCore } from "../../lib";
import {
	PlanManagementFeature,
	SubscriptionFeature,
	PaymentFeature,
	TelegramFeature,
	LoggingFeature,
} from "./application";
import {
	createPlanCommand,
	subscribeUserCommand,
	confirmPaymentCommand,
	revokeExpiredSubscriptionsCommand,
	revokeAccessCommand,
	listPlansQuery,
	findSubscriptionByUserIdQuery,
} from "./application";

// Wrapper classes for testing (similar to composition.ts)
class TestPlanAdapter {
	private dbPath: string;

	constructor(dbPath: string = ":memory:") {
		this.dbPath = dbPath;
	}

	async savePlan(input: { plan: any }): Promise<void> {
		// For testing, we'll use a simple in-memory store
		const plans = ((globalThis as any).__testPlans =
			(globalThis as any).__testPlans || new Map());
		plans.set(input.plan.id, { ...input.plan });
	}

	async findPlanById(input: { id: string }): Promise<any> {
		const plans = (globalThis as any).__testPlans || new Map();
		return plans.get(input.id) || null;
	}

	async findPlanByName(input: { name: string }): Promise<any> {
		const plans = (globalThis as any).__testPlans || new Map();
		return Array.from(plans.values()).find((p: any) => p.name === input.name) || null;
	}

	async listPlans(): Promise<any[]> {
		const plans = (globalThis as any).__testPlans || new Map();
		return Array.from(plans.values());
	}
}

class TestSubscriptionAdapter {
	private dbPath: string;

	constructor(dbPath: string = ":memory:") {
		this.dbPath = dbPath;
	}

	async saveSubscription(input: { subscription: any }): Promise<void> {
		const subscriptions = ((globalThis as any).__testSubscriptions =
			(globalThis as any).__testSubscriptions || new Map());
		subscriptions.set(input.subscription.id, { ...input.subscription });
	}

	async updateSubscription(input: { subscription: any }): Promise<void> {
		await this.saveSubscription(input);
	}

	async findSubscriptionById(input: { id: string }): Promise<any> {
		const subscriptions = (globalThis as any).__testSubscriptions || new Map();
		return subscriptions.get(input.id) || null;
	}

	async findSubscriptionsByUserId(input: { userId: string }): Promise<any[]> {
		const subscriptions = (globalThis as any).__testSubscriptions || new Map();
		return Array.from(subscriptions.values()).filter(
			(s: any) => s.userId === input.userId,
		);
	}

	async listAllSubscriptions(): Promise<any[]> {
		const subscriptions = (globalThis as any).__testSubscriptions || new Map();
		return Array.from(subscriptions.values());
	}

	async findExpiredSubscriptions(input: { now: Date }): Promise<any[]> {
		const subscriptions = (globalThis as any).__testSubscriptions || new Map();
		return Array.from(subscriptions.values()).filter(
			(s: any) =>
				s.status === "active" && s.expiresAt && s.expiresAt < input.now,
		);
	}

	async saveAccessGrant(input: { accessGrant: any }): Promise<void> {
		const accessGrants = ((globalThis as any).__testAccessGrants =
			(globalThis as any).__testAccessGrants || new Map());
		accessGrants.set(input.accessGrant.id, { ...input.accessGrant });
	}

	async updateAccessGrant(input: { accessGrant: any }): Promise<void> {
		await this.saveAccessGrant(input);
	}

	async findAccessGrantBySubscriptionId(input: {
		subscriptionId: string;
	}): Promise<any> {
		const accessGrants = (globalThis as any).__testAccessGrants || new Map();
		return (
			Array.from(accessGrants.values()).find(
				(ag: any) => ag.subscriptionId === input.subscriptionId,
			) || null
		);
	}

	async findAccessGrantsByUserId(input: { userId: string }): Promise<any[]> {
		const accessGrants = (globalThis as any).__testAccessGrants || new Map();
		return Array.from(accessGrants.values()).filter(
			(ag: any) => ag.userId === input.userId,
		);
	}
}

class TestPaymentAdapter {
	async paymentProvider(input: {
		subscriptionId: string;
		amount: number;
		currency: string;
	}): Promise<{ paymentUrl: string; externalId: string }> {
		return {
			paymentUrl: `https://demo-payment.sotajs.dev/pay/${input.subscriptionId}`,
			externalId: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
		};
	}
}

class TestTelegramAdapter {
	async grantTelegramAccess(input: {
		userId: string;
		resourceId: string;
	}): Promise<{ inviteLink: string }> {
		// For testing, return a demo link
		return {
			inviteLink: `https://t.me/sotajs?text=Test: Access to ${input.resourceId} for ${input.userId}`,
		};
	}

	async revokeTelegramAccess(input: {
		userId: string;
		resourceId: string;
	}): Promise<void> {
		// No-op for testing
		console.log(
			`[TEST] Would revoke access for ${input.userId} from ${input.resourceId}`,
		);
	}
}

class TestLoggerAdapter {
	async logger(input: {
		level: "info" | "warn" | "error";
		message: string;
		context?: Record<string, any>;
	}): Promise<void> {
		// Silent logger for tests
	}
}

describe("TG Paywall System", () => {
	beforeEach(() => {
		resetDI();

		// Clear test data
		(globalThis as any).__testPlans = new Map();
		(globalThis as any).__testSubscriptions = new Map();
		(globalThis as any).__testAccessGrants = new Map();

		// Create core with features
		const core = defineCore({
			plans: PlanManagementFeature,
			subscriptions: SubscriptionFeature,
			payment: PaymentFeature,
			telegram: TelegramFeature,
			logging: LoggingFeature,
		});

		// Bind test adapters
		core.bindFeatures(
			({ plans, subscriptions, payment, telegram, logging }) => {
				plans.bind(TestPlanAdapter);
				subscriptions.bind(TestSubscriptionAdapter);
				payment.bind(TestPaymentAdapter);
				telegram.bind(TestTelegramAdapter);
				logging.bind(TestLoggerAdapter);
			},
		);
	});

	it("should complete a full subscription flow", async () => {
		// 1. Create plan
		const { planId } = await createPlanCommand({
			name: "Test Plan",
			price: 100,
			currency: "USD",
			durationDays: 30,
			channelId: "channel-1",
		});

		// 2. Start subscription
		const { subscriptionId, paymentUrl } = await subscribeUserCommand({
			userId: "user-1",
			planId,
		});
		expect(subscriptionId).toBeDefined();
		expect(paymentUrl).toContain(subscriptionId);

		// 3. Confirm payment
		const confirmResult = await confirmPaymentCommand({
			subscriptionId,
			externalPaymentId: "ext-1",
		});
		expect(confirmResult.success).toBe(true);
		expect(confirmResult.inviteLink).toBeDefined();
		expect(confirmResult.expiresAt).toBeDefined();

		// 4. Verify queries
		const plans = await listPlansQuery();
		expect(plans.length).toBe(1);
		expect(plans[0].channelId).toBe("channel-1");

		const userSub = await findSubscriptionByUserIdQuery({ userId: "user-1" });
		expect(userSub).not.toBeNull();
		expect(userSub?.subscription?.id).toBe(subscriptionId);
		expect(userSub?.accessGrant?.resourceId).toBe("channel-1");
	});

	it("should not allow creating plans with duplicate names", async () => {
		// 1. Create first plan
		await createPlanCommand({
			name: "Unique Plan",
			price: 100,
			currency: "USD",
			durationDays: 30,
			channelId: "channel-1",
		});

		// 2. Try to create second plan with same name
		await expect(
			createPlanCommand({
				name: "Unique Plan",
				price: 200,
				currency: "USD",
				durationDays: 60,
				channelId: "channel-2",
			}),
		).rejects.toThrow('Plan with name "Unique Plan" already exists');
	});

	it("should revoke expired subscriptions", async () => {
		// Create plan
		const { planId } = await createPlanCommand({
			name: "Expired Plan",
			price: 10,
			currency: "USD",
			durationDays: 30,
			channelId: "channel-1",
		});

		// Create subscription
		const { subscriptionId } = await subscribeUserCommand({
			userId: "expired-user",
			planId,
		});

		// Confirm payment
		await confirmPaymentCommand({
			subscriptionId,
			externalPaymentId: "ext-expired",
		});

		// Manually update subscription to be expired
		const adapter = new TestSubscriptionAdapter();
		const now = new Date();
		const expiresAt = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

		await adapter.updateSubscription({
			subscription: {
				id: subscriptionId,
				userId: "expired-user",
				planId,
				status: "active",
				expiresAt,
				price: 10,
				currency: "USD",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		// Run worker
		const result = await revokeExpiredSubscriptionsCommand();

		expect(result.processedCount).toBe(1);
		expect(result.revokedCount).toBe(1);
		expect(result.details[0].userId).toBe("expired-user");

		// Check sub is expired
		const updatedSub = await adapter.findSubscriptionById({
			id: subscriptionId,
		});
		expect(updatedSub?.status).toBe("expired");

		// Check access grant is revoked
		const updatedAccess = await adapter.findAccessGrantBySubscriptionId({
			subscriptionId,
		});
		expect(updatedAccess?.status).toBe("revoked");
	});

	it("should manually revoke access", async () => {
		// 1. Setup active sub
		const { planId } = await createPlanCommand({
			name: "Manual Revoke Plan",
			price: 50,
			currency: "USD",
			durationDays: 30,
			channelId: "channel-manual",
		});

		const { subscriptionId } = await subscribeUserCommand({
			userId: "manual-user",
			planId,
		});

		await confirmPaymentCommand({
			subscriptionId,
			externalPaymentId: "ext-manual",
		});

		// 2. Manually revoke
		const revokeResult = await revokeAccessCommand({
			userId: "manual-user",
			subscriptionId,
		});

		expect(revokeResult.success).toBe(true);

		// 3. Verify revocation
		const adapter = new TestSubscriptionAdapter();
		const updatedAccess = await adapter.findAccessGrantBySubscriptionId({
			subscriptionId,
		});
		expect(updatedAccess?.status).toBe("revoked");
	});
});
