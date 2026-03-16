import { createPort } from "../../../../lib";

/**
 * DTOs
 */

export type PlanDto = {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  channelId: string; // NEW
  createdAt: Date;
  updatedAt: Date;
};

export type SubscriptionDto = {
  id: string;
  userId: string;
  planId: string;
  status: "pending" | "active" | "expired" | "cancelled";
  expiresAt?: Date;
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessGrantDto = {
  id: string;
  userId: string;
  resourceId: string;
  resourceType: "telegram_channel" | "telegram_chat";
  status: "active" | "revoked";
  subscriptionId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Ports: Persistence
 */

export const savePlanPort = createPort<(input: { plan: PlanDto }) => void>();
export const findPlanByIdPort = createPort<(input: { id: string }) => PlanDto | null>();
export const listPlansPort = createPort<() => PlanDto[]>();

export const saveSubscriptionPort = createPort<(input: { subscription: SubscriptionDto }) => void>();
export const updateSubscriptionPort = createPort<(input: { subscription: SubscriptionDto }) => void>();
export const findSubscriptionByIdPort = createPort<(input: { id: string }) => SubscriptionDto | null>();
export const findSubscriptionsByUserIdPort = createPort<(input: { userId: string }) => SubscriptionDto[]>();
export const listAllSubscriptionsPort = createPort<() => SubscriptionDto[]>(); // NEW: Для админки
export const findExpiredSubscriptionsPort = createPort<(input: { now: Date }) => SubscriptionDto[]>();

export const saveAccessGrantPort = createPort<(input: { accessGrant: AccessGrantDto }) => void>();
export const updateAccessGrantPort = createPort<(input: { accessGrant: AccessGrantDto }) => void>();
export const findAccessGrantBySubscriptionIdPort = createPort<(input: { subscriptionId: string }) => AccessGrantDto | null>();

/**
 * Ports: External Services
 */

export const paymentProviderPort = createPort<(input: {
  subscriptionId: string;
  amount: number;
  currency: string;
}) => { paymentUrl: string; externalId: string }>();

export const grantTelegramAccessPort = createPort<(input: { 
  userId: string; 
  resourceId: string 
}) => { inviteLink: string }>();

export const revokeTelegramAccessPort = createPort<(input: { 
  userId: string; 
  resourceId: string 
}) => void>();

export const loggerPort = createPort<(input: {
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, any>;
}) => void>();
