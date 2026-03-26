import { z } from "zod";
import { usePort } from "../../../../lib";
import { FunctionDto, getFunctionPort, loggerPort } from "../ports";
import { getProfilePort } from "../../infrastructure/ports/identity.ports";

/**
 * Query: Get a cloud function by ID
 */

const GetFunctionInputSchema = z.object({
  functionId: z.string().uuid(),
  profileName: z.string().optional(),
});

type GetFunctionInput = z.infer<typeof GetFunctionInputSchema>;

type GetFunctionResult =
  | { success: true; function: FunctionDto }
  | { success: false; error: string };

export const getFunctionQuery = async (
  input: GetFunctionInput
): Promise<GetFunctionResult> => {
  const query = GetFunctionInputSchema.parse(input);

  const getFunction = usePort(getFunctionPort);
  const logger = usePort(loggerPort);
  const getProfile = usePort(getProfilePort);

  let cloudConfig: { oauthToken: string; folderId: string } | undefined;

  if (query.profileName) {
    const profile = await getProfile(query.profileName);
    if (profile) {
      cloudConfig = { oauthToken: profile.oauthToken, folderId: profile.folderId };
    }
  }

  await logger({
    level: "info",
    message: `Fetching function: ${query.functionId}`,
  });

  const func = await getFunction({ 
    functionId: query.functionId,
    cloudConfig 
  });

  if (!func) {
    await logger({
      level: "warn",
      message: `Function not found: ${query.functionId}`,
    });

    return {
      success: false,
      error: `Function '${query.functionId}' not found`,
    };
  }

  await logger({
    level: "info",
    message: `Function retrieved successfully`,
    context: {
      functionId: func.id,
      name: func.name,
      status: func.status,
    },
  });

  return {
    success: true,
    function: func,
  };
};

export type { FunctionDto, GetFunctionInput, GetFunctionResult };
