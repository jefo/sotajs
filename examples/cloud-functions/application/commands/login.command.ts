import { z } from "zod";
import { usePort } from "../../../../lib";
import { authenticatePort } from "../../infrastructure/ports/identity.ports";

/**
 * Command: Authenticate user identity
 */

const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

type LoginInput = z.infer<typeof LoginInputSchema>;

type LoginResult = 
  | { success: true; token: string; userId: string }
  | { success: false; error: string };

export const loginCommand = async (input: LoginInput): Promise<LoginResult> => {
  const data = LoginInputSchema.parse(input);
  const authenticate = usePort(authenticatePort);

  const result = await authenticate(data);

  if (result.success) {
    return { 
      success: true, 
      token: result.token, 
      userId: result.identity.id 
    };
  }

  return { success: false, error: result.error };
};
