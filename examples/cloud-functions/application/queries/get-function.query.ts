import { z } from "zod";
import { usePort } from "../../../../lib";
import { getFunctionPort, loggerPort, FunctionDto } from "../../infrastructure/ports/cloud.ports";

/**
 * Query: Get a cloud function by ID
 */

const GetFunctionInputSchema = z.object({
  functionId: z.string().uuid(),
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

  await logger({
    level: "info",
    message: `Fetching function: ${query.functionId}`,
  });

  const func = await getFunction({ functionId: query.functionId });

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
