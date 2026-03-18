import { z } from "zod";
import { usePorts } from "../../../../lib";
import { findAccessGrantsByUserIdPort } from "../ports/paywall.ports";

const CheckAccessInputSchema = z.object({
  userId: z.string(),
  resourceId: z.string(),
});

type CheckAccessInput = z.infer<typeof CheckAccessInputSchema>;

/**
 * Query: Проверить, есть ли у пользователя активный доступ к ресурсу
 */
export const checkAccessQuery = async (input: CheckAccessInput): Promise<boolean> => {
  const { userId, resourceId } = CheckAccessInputSchema.parse(input);
  
  const { findAccessGrants } = usePorts({
    findAccessGrants: findAccessGrantsByUserIdPort,
  });

  const grants = await findAccessGrants({ userId });
  
  // Проверяем, есть ли хоть одно активное разрешение для данного канала
  return grants.some(grant => 
    grant.resourceId === resourceId && 
    grant.status === "active"
  );
};
