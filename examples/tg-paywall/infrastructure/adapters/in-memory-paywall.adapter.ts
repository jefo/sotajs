import { FeaturePorts, defineFeature } from "../../../../lib";
import {
  savePlanPort,
  findPlanByIdPort,
  listPlansPort,
  saveSubscriptionPort,
  updateSubscriptionPort,
  findSubscriptionByIdPort,
  findSubscriptionsByUserIdPort,
  listAllSubscriptionsPort,
  findExpiredSubscriptionsPort,
  saveAccessGrantPort,
  updateAccessGrantPort,
  findAccessGrantBySubscriptionIdPort,
  paymentProviderPort,
  grantTelegramAccessPort,
  revokeTelegramAccessPort,
  loggerPort,
  PlanDto,
  SubscriptionDto,
  AccessGrantDto,
} from "../../application/ports/paywall.ports";

export const PaywallFeature = defineFeature({
  savePlan: savePlanPort,
  findPlanById: findPlanByIdPort,
  listPlans: listPlansPort,
  saveSubscription: saveSubscriptionPort,
  updateSubscription: updateSubscriptionPort,
  findSubscriptionById: findSubscriptionByIdPort,
  findSubscriptionsByUserId: findSubscriptionsByUserIdPort,
  listAllSubscriptions: listAllSubscriptionsPort,
  findExpiredSubscriptions: findExpiredSubscriptionsPort,
  saveAccessGrant: saveAccessGrantPort,
  updateAccessGrant: updateAccessGrantPort,
  findAccessGrantBySubscriptionId: findAccessGrantBySubscriptionIdPort,
  paymentProvider: paymentProviderPort,
  grantTelegramAccess: grantTelegramAccessPort,
  revokeTelegramAccess: revokeTelegramAccessPort,
  logger: loggerPort,
});

export class InMemoryPaywallAdapter implements FeaturePorts<typeof PaywallFeature> {
  // Use static maps to share state across instances for easier testing
  private static plans: Map<string, PlanDto> = new Map();
  private static subscriptions: Map<string, SubscriptionDto> = new Map();
  private static accessGrants: Map<string, AccessGrantDto> = new Map();

  static clear(): void {
    this.plans.clear();
    this.subscriptions.clear();
    this.accessGrants.clear();
  }

  async savePlan(input: { plan: PlanDto }): Promise<void> {
    InMemoryPaywallAdapter.plans.set(input.plan.id, { ...input.plan });
  }

  async findPlanById(input: { id: string }): Promise<PlanDto | null> {
    return InMemoryPaywallAdapter.plans.get(input.id) || null;
  }

  async listPlans(): Promise<PlanDto[]> {
    return Array.from(InMemoryPaywallAdapter.plans.values());
  }

  async saveSubscription(input: { subscription: SubscriptionDto }): Promise<void> {
    InMemoryPaywallAdapter.subscriptions.set(input.subscription.id, { ...input.subscription });
  }

  async updateSubscription(input: { subscription: SubscriptionDto }): Promise<void> {
    InMemoryPaywallAdapter.subscriptions.set(input.subscription.id, { ...input.subscription });
  }

  async findSubscriptionById(input: { id: string }): Promise<SubscriptionDto | null> {
    return InMemoryPaywallAdapter.subscriptions.get(input.id) || null;
  }

  async findSubscriptionsByUserId(input: { userId: string }): Promise<SubscriptionDto[]> {
    return Array.from(InMemoryPaywallAdapter.subscriptions.values()).filter(
      (s) => s.userId === input.userId
    );
  }

  async listAllSubscriptions(): Promise<SubscriptionDto[]> {
    return Array.from(InMemoryPaywallAdapter.subscriptions.values());
  }

  async findExpiredSubscriptions(input: { now: Date }): Promise<SubscriptionDto[]> {
    return Array.from(InMemoryPaywallAdapter.subscriptions.values()).filter(
      (s) => s.status === "active" && s.expiresAt && s.expiresAt < input.now
    );
  }

  async saveAccessGrant(input: { accessGrant: AccessGrantDto }): Promise<void> {
    InMemoryPaywallAdapter.accessGrants.set(input.accessGrant.id, { ...input.accessGrant });
  }

  async updateAccessGrant(input: { accessGrant: AccessGrantDto }): Promise<void> {
    InMemoryPaywallAdapter.accessGrants.set(input.accessGrant.id, { ...input.accessGrant });
  }

  async findAccessGrantBySubscriptionId(input: { subscriptionId: string }): Promise<AccessGrantDto | null> {
    return Array.from(InMemoryPaywallAdapter.accessGrants.values()).find((ag) => ag.subscriptionId === input.subscriptionId) || null;
  }

  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    return {
      paymentUrl: `https://stripe.com/pay/${input.subscriptionId}`,
      externalId: `stripe_${Math.random().toString(36).substring(7)}`,
    };
  }

  async grantTelegramAccess(input: { userId: string; resourceId: string }): Promise<{ inviteLink: string }> {
    return { inviteLink: `https://t.me/joinchat/${Math.random().toString(36).substring(7)}` };
  }

  async revokeTelegramAccess(input: { userId: string; resourceId: string }): Promise<void> {
    console.log(`[Telegram] User ${input.userId} banned from ${input.resourceId}`);
  }

  async logger(input: {
    level: "info" | "warn" | "error";
    message: string;
    context?: Record<string, any>;
  }): Promise<void> {
    const context = input.context ? ` | ${JSON.stringify(input.context)}` : "";
    console.log(`[${input.level.toUpperCase()}] ${input.message}${context}`);
  }
}
