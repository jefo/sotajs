import { z } from "zod";
import { usePorts } from "../../../../lib";
import {
  findSubscriptionsByUserIdPort,
  findAccessGrantBySubscriptionIdPort,
  SubscriptionDto,
  AccessGrantDto,
} from "../ports/paywall.ports";

const FindSubscriptionByUserIdInputSchema = z.object({
  userId: z.string(),
});

type FindSubscriptionByUserIdInput = z.infer<typeof FindSubscriptionByUserIdInputSchema>;

/**
 * Query: Найти последнюю активную подписку пользователя
 */
export const findSubscriptionByUserIdQuery = async (
  input: FindSubscriptionByUserIdInput
): Promise<{
  subscription: SubscriptionDto | null;
  accessGrant: AccessGrantDto | null;
} | null> => {
  const { userId } = FindSubscriptionByUserIdInputSchema.parse(input);
  
  const { findSubscriptions, findAccessGrant } = usePorts({
    findSubscriptions: findSubscriptionsByUserIdPort,
    findAccessGrant: findAccessGrantBySubscriptionIdPort,
  });

  const subscriptions = await findSubscriptions({ userId });
  
  if (subscriptions.length === 0) return null;

  // Find latest active subscription
  const activeSubs = subscriptions
    .filter(s => s.status === "active")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (activeSubs.length === 0) {
    // If no active, maybe return the latest overall? 
    // Requirement says "последнюю активную", so I'll stick to active.
    return null;
  }

  const latestActive = activeSubs[0];
  const accessGrant = await findAccessGrant({ subscriptionId: latestActive.id });

  return {
    subscription: latestActive,
    accessGrant,
  };
};
