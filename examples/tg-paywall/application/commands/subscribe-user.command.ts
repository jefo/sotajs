import { z } from "zod";
import { usePorts } from "../../../../lib";
import { Subscription } from "../../domain/subscription.aggregate";
import {
  findPlanByIdPort,
  saveSubscriptionPort,
  paymentProviderPort,
  loggerPort,
} from "../ports/paywall.ports";

const SubscribeUserInputSchema = z.object({
  userId: z.string(),
  planId: z.string().uuid(),
});

type SubscribeUserInput = z.infer<typeof SubscribeUserInputSchema>;

export const subscribeUserCommand = async (input: SubscribeUserInput) => {
  const { userId, planId } = SubscribeUserInputSchema.parse(input);

  const ports = usePorts({
    findPlanById: findPlanByIdPort,
    saveSubscription: saveSubscriptionPort,
    getPaymentUrl: paymentProviderPort,
    logger: loggerPort,
  });

  const plan = await ports.findPlanById({ id: planId });
  if (!plan) throw new Error("Plan not found");

  const subscription = Subscription.create({
    id: crypto.randomUUID(),
    userId,
    planId: plan.id,
    status: "pending",
    price: plan.price,
    currency: plan.currency,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const { paymentUrl } = await ports.getPaymentUrl({
    subscriptionId: subscription.id,
    amount: plan.price,
    currency: plan.currency,
  });

  await ports.saveSubscription({ subscription: subscription.props });

  await ports.logger({
    level: "info",
    message: `User ${userId} started subscription for plan ${plan.name}`,
    context: { subscriptionId: subscription.id },
  });

  return {
    subscriptionId: subscription.id,
    paymentUrl,
  };
};
