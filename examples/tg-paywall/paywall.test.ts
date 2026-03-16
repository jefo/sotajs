import { describe, it, expect, beforeEach } from "bun:test";
import { resetDI, defineCore } from "../../lib";
import { PaywallFeature, InMemoryPaywallAdapter } from "./infrastructure";
import {
  createPlanCommand,
  subscribeUserCommand,
  confirmPaymentCommand,
  revokeExpiredSubscriptionsCommand,
  revokeAccessCommand,
  listPlansQuery,
  findSubscriptionByUserIdQuery,
} from "./application";

describe("TG Paywall System", () => {
  beforeEach(() => {
    resetDI();
    InMemoryPaywallAdapter.clear();
    const core = defineCore({
      paywall: PaywallFeature,
    });
    core.bindFeatures(({ paywall }) => {
      paywall.bind(InMemoryPaywallAdapter);
    });
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

  it("should revoke expired subscriptions", async () => {
    const tempAdapter = new InMemoryPaywallAdapter();
    
    const subId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const userId = "expired-user";
    const resourceId = "channel-1";

    const now = new Date();
    const expiresAt = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

    await tempAdapter.savePlan({
      plan: {
        id: planId,
        name: "Expired Plan",
        price: 10,
        currency: "USD",
        durationDays: 30,
        channelId: resourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tempAdapter.saveSubscription({
      subscription: {
        id: subId,
        userId,
        planId,
        status: "active",
        expiresAt,
        price: 10,
        currency: "USD",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tempAdapter.saveAccessGrant({
      accessGrant: {
        id: crypto.randomUUID(),
        userId,
        resourceId,
        resourceType: "telegram_channel",
        status: "active",
        subscriptionId: subId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Run worker
    const result = await revokeExpiredSubscriptionsCommand();
    
    expect(result.processedCount).toBe(1);
    expect(result.revokedCount).toBe(1);
    expect(result.details[0].userId).toBe(userId);

    // Check sub is expired
    const updatedSub = await tempAdapter.findSubscriptionById({ id: subId });
    expect(updatedSub?.status).toBe("expired");

    // Check access grant is revoked
    const updatedAccess = await tempAdapter.findAccessGrantBySubscriptionId({ subscriptionId: subId });
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
    const adapter = new InMemoryPaywallAdapter();
    const updatedAccess = await adapter.findAccessGrantBySubscriptionId({ subscriptionId });
    expect(updatedAccess?.status).toBe("revoked");
  });
});
