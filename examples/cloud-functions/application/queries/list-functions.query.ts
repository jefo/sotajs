import { z } from "zod";
import { usePort } from "../../../../lib";
import { listFunctionsPort, loggerPort, FunctionDto } from "../../infrastructure/ports/cloud.ports";

/**
 * Query: List cloud functions with optional filtering
 */

const ListFunctionsInputSchema = z.object({
  folderId: z.string().optional(),
  status: z.enum(["creating", "active", "error", "deleting"]).optional(),
});

type ListFunctionsInput = z.infer<typeof ListFunctionsInputSchema>;

type ListFunctionsResult = {
  functions: FunctionDto[];
  totalCount: number;
};

export const listFunctionsQuery = async (
  input: ListFunctionsInput = {}
): Promise<ListFunctionsResult> => {
  const query = ListFunctionsInputSchema.parse(input);

  const listFunctions = usePort(listFunctionsPort);
  const logger = usePort(loggerPort);

  await logger({
    level: "info",
    message: "Listing functions",
    context: {
      folderId: query.folderId,
      status: query.status,
    },
  });

  const result = await listFunctions({
    folderId: query.folderId,
    status: query.status,
  });

  await logger({
    level: "info",
    message: `Retrieved ${result.totalCount} function(s)`,
  });

  return result;
};

export type { FunctionDto, ListFunctionsInput, ListFunctionsResult };
