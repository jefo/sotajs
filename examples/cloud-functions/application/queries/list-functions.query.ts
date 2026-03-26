import { z } from "zod";
import { usePort } from "../../../../lib";
import { FunctionDto, listFunctionsPort, loggerPort } from "../ports";
import { getProfilePort } from "../../infrastructure/ports/identity.ports";

/**
 * Query: List cloud functions with optional filtering
 */

const ListFunctionsInputSchema = z.object({
  folderId: z.string().optional(),
  status: z.enum(["creating", "active", "error", "deleting"]).optional(),
  profileName: z.string().optional(),
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
    message: "Listing functions",
    context: {
      folderId: query.folderId,
      status: query.status,
    },
  });

  const result = await listFunctions({
    folderId: query.folderId,
    status: query.status,
    cloudConfig
  });

  await logger({
    level: "info",
    message: `Retrieved ${result.totalCount} function(s)`,
  });

  return result;
};

export type { FunctionDto, ListFunctionsInput, ListFunctionsResult };
