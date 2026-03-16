import { usePorts } from "../../../../lib";
import { listAllSubscriptionsPort, SubscriptionDto } from "../ports/paywall.ports";

/**
 * Query: Получить список всех активных подписок (для админки)
 */
export const listActiveSubscriptionsQuery = async (): Promise<SubscriptionDto[]> => {
  const { listAll } = usePorts({ listAll: listAllSubscriptionsPort });
  const all = await listAll();
  
  return all.filter(s => s.status === "active");
};
