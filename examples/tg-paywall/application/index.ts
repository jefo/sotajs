export * from "./commands/create-plan.command";
export * from "./commands/subscribe-user.command";
export * from "./commands/confirm-payment.command";
export * from "./commands/revoke-expired-subscriptions.command";
export * from "./commands/revoke-access.command";
export * from "./commands/update-template.command";
export * from "./commands/deploy-cloud-function.command"; // NEW

export * from "./queries/list-plans.query";
export * from "./queries/find-subscription-by-user-id.query";
export * from "./queries/list-active-subscriptions.query";
export * from "./queries/check-access.query";
export * from "./queries/get-formatted-message.query";

// Export features
export * from "./features/plan-management.feature";
export * from "./features/subscription.feature";
export * from "./features/payment.feature";
export * from "./features/telegram.feature";
export * from "./features/logging.feature";
export * from "./features/messaging.feature";
export * from "./features/deployment.feature"; // NEW

// Export ports
export * from "./ports/paywall.ports";
export * from "./ports/deployment.port"; // NEW
