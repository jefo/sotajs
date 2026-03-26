import { z } from "zod";
import { usePort } from "../../../../lib";
import { createIdentityPort } from "../../infrastructure/ports/identity.ports";

/**
 * Command: Register a new user identity
 */

const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  metadata: z.record(z.any()).optional(),
});

type RegisterInput = z.infer<typeof RegisterInputSchema>;

type RegisterResult = 
  | { success: true; identityId: string }
  | { success: false; error: string };

export const registerCommand = async (input: RegisterInput): Promise<RegisterResult> => {
  const data = RegisterInputSchema.parse(input);
  const createIdentity = usePort(createIdentityPort);

  try {
    const identity = await createIdentity(data);
    return { success: true, identityId: identity.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
