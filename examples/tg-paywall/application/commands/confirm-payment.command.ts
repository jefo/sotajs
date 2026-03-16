import { z } from "zod";
import { usePorts } from "../../../../lib";
import { Subscription, AccessGrant, Plan } from "../../domain";
import {
  findSubscriptionByIdPort,
  updateSubscriptionPort,
  findPlanByIdPort,
  grantTelegramAccessPort,
  saveAccessGrantPort,
  loggerPort,
} from "../ports/paywall.ports";

const ConfirmPaymentInputSchema = z.object({
  subscriptionId: z.string().uuid(),
  externalPaymentId: z.string(),
});

type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentInputSchema>;

export const confirmPaymentCommand = async (input: ConfirmPaymentInput) => {
  const { subscriptionId } = ConfirmPaymentInputSchema.parse(input);
  
  const ports = usePorts({
    findSubscriptionById: findSubscriptionByIdPort,
    updateSubscription: updateSubscriptionPort,
    findPlanById: findPlanByIdPort,
    grantTelegramAccess: grantTelegramAccessPort,
    saveAccessGrant: saveAccessGrantPort,
    logger: loggerPort,
  });

  const subData = await ports.findSubscriptionById({ id: subscriptionId });
  if (!subData) throw new Error("Subscription not found");

  const subscription = Subscription.create(subData);
  const planData = await ports.findPlanById({ id: subscription.props.planId });
  if (!planData) throw new Error("Plan not found");

  const plan = Plan.create(planData);

  // Activate subscription
  subscription.actions.activate(plan.props.durationDays);
  await ports.updateSubscription({ subscription: subscription.props });

  // Grant access using channelId from plan
  const { inviteLink } = await ports.grantTelegramAccess({
    userId: subscription.props.userId,
    resourceId: plan.props.channelId,
  });

  const accessGrant = AccessGrant.create({
    id: crypto.randomUUID(),
    userId: subscription.props.userId,
    resourceId: plan.props.channelId,
    resourceType: "telegram_channel", // Default for this simplified command
    status: "active",
    subscriptionId: subscription.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await ports.saveAccessGrant({ accessGrant: accessGrant.props });

  await ports.logger({
    level: "info",
    message: `Subscription ${subscription.id} activated. Access granted.`,
    context: { userId: subscription.props.userId, inviteLink, channelId: plan.props.channelId },
  });

  return {
    success: true,
    inviteLink,
    expiresAt: subscription.props.expiresAt,
  };
};
