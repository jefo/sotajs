import { usePorts } from "../../../../lib";
import { Subscription, AccessGrant } from "../../domain";
import {
  findExpiredSubscriptionsPort,
  updateSubscriptionPort,
  findAccessGrantBySubscriptionIdPort,
  updateAccessGrantPort,
  revokeTelegramAccessPort,
  loggerPort,
} from "../ports/paywall.ports";

export const revokeExpiredSubscriptionsCommand = async () => {
  const ports = usePorts({
    findExpired: findExpiredSubscriptionsPort,
    updateSub: updateSubscriptionPort,
    findAccess: findAccessGrantBySubscriptionIdPort,
    updateAccess: updateAccessGrantPort,
    revokeTelegramAccess: revokeTelegramAccessPort,
    logger: loggerPort,
  });

  const expiredSubsData = await ports.findExpired({ now: new Date() });
  
  const results = [];
  
  for (const subData of expiredSubsData) {
    const subscription = Subscription.create(subData);
    
    // 1. Expire subscription
    subscription.actions.expire();
    await ports.updateSub({ subscription: subscription.props });
    
    // 2. Revoke access grant
    const accessData = await ports.findAccess({ subscriptionId: subscription.id });
    if (accessData) {
      const accessGrant = AccessGrant.create(accessData);
      accessGrant.actions.revoke();
      await ports.updateAccess({ accessGrant: accessGrant.props });
      
      // 3. Remove from Telegram
      await ports.revokeTelegramAccess({
        userId: accessGrant.props.userId,
        resourceId: accessGrant.props.resourceId,
      });
      
      await ports.logger({
        level: "info",
        message: `Revoked access for user ${accessGrant.props.userId} due to expired subscription ${subscription.id}`,
      });
      
      results.push({
        subscriptionId: subscription.id,
        userId: accessGrant.props.userId,
        revoked: true,
      });
    }
  }

  return {
    processedCount: expiredSubsData.length,
    revokedCount: results.length,
    details: results,
  };
};
