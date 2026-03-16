import { z } from "zod";
import { usePorts } from "../../../../lib";
import { AccessGrant } from "../../domain";
import {
  findAccessGrantBySubscriptionIdPort,
  updateAccessGrantPort,
  revokeTelegramAccessPort,
  loggerPort,
} from "../ports/paywall.ports";

const RevokeAccessInputSchema = z.object({
  userId: z.string(),
  subscriptionId: z.string().uuid(),
});

type RevokeAccessInput = z.infer<typeof RevokeAccessInputSchema>;

/**
 * Command: Отозвать доступ вручную
 */
export const revokeAccessCommand = async (input: RevokeAccessInput) => {
  const { userId, subscriptionId } = RevokeAccessInputSchema.parse(input);
  
  const ports = usePorts({
    findAccessGrant: findAccessGrantBySubscriptionIdPort,
    updateAccessGrant: updateAccessGrantPort,
    revokeTelegramAccess: revokeTelegramAccessPort,
    logger: loggerPort,
  });

  const accessData = await ports.findAccessGrant({ subscriptionId });
  if (!accessData) throw new Error("Access grant not found for this subscription");

  const accessGrant = AccessGrant.create(accessData);
  
  // 1. Revoke on aggregate
  accessGrant.actions.revoke();
  
  // 2. Update in repository
  await ports.updateAccessGrant({ accessGrant: accessGrant.props });
  
  // 3. Revoke in Telegram
  await ports.revokeTelegramAccess({
    userId: accessGrant.props.userId,
    resourceId: accessGrant.props.resourceId,
  });

  await ports.logger({
    level: "info",
    message: `Manual access revocation for user ${userId}, sub ${subscriptionId}`,
  });

  return { success: true };
};
