import { usePorts } from "../../../../lib";
import { listPlansPort, PlanDto } from "../ports/paywall.ports";

/**
 * Query: Получить все доступные тарифы
 */
export const listPlansQuery = async (): Promise<PlanDto[]> => {
  const { listPlans } = usePorts({ listPlans: listPlansPort });
  return await listPlans();
};
