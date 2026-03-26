import { z } from "zod";
import { usePort } from "../../../../lib";
import { CloudFunction } from "../../domain/function.aggregate";
import { deleteFunctionPort, getFunctionPort, loggerPort } from "../ports";
import { getProfilePort } from "../../infrastructure/ports/identity.ports";

/**
 * Command: Delete a cloud function
 */

const DeleteFunctionInputSchema = z.object({
  functionId: z.string().min(1),
  profileName: z.string().optional(),
});

type DeleteFunctionInput = z.infer<typeof DeleteFunctionInputSchema>;

type DeleteFunctionResult =
  | { success: true }
  | { success: false; error: string };

export const deleteFunctionCommand = async (
  input: DeleteFunctionInput
): Promise<DeleteFunctionResult> => {
  const command = DeleteFunctionInputSchema.parse(input);

  const deleteFunction = usePort(deleteFunctionPort);
  const getFunction = usePort(getFunctionPort);
  const logger = usePort(loggerPort);
  const getProfile = usePort(getProfilePort);

  let cloudConfig: { oauthToken: string; folderId: string } | undefined;

  if (command.profileName) {
    const profile = await getProfile(command.profileName);
    if (profile) {
      cloudConfig = { oauthToken: profile.oauthToken, folderId: profile.folderId };
    }
  }

  // Get function metadata
  const funcData = await getFunction({ 
    functionId: command.functionId,
    cloudConfig 
  });

  if (!funcData) {
    await logger({
      level: "error",
      message: `Function not found: ${command.functionId}`,
    });

    return {
      success: false,
      error: `Function '${command.functionId}' not found`,
    };
  }

  await logger({
    level: "info",
    message: `Deleting function '${funcData.name}'`,
    context: {
      functionId: command.functionId,
      currentStatus: funcData.status,
    },
  });

  // Create aggregate for event tracking
  const func = CloudFunction.create({
    id: funcData.id,
    name: funcData.name,
    runtime: funcData.runtime,
    entrypoint: funcData.entrypoint,
    memory: funcData.memory,
    executionTimeout: funcData.executionTimeout,
    code: funcData.code,
    environment: funcData.environment,
    status: funcData.status,
    version: funcData.version,
    createdAt: funcData.createdAt,
    updatedAt: funcData.updatedAt,
  });

  // Mark for deletion
  func.actions.markForDeletion();

  // Delete function
  const result = await deleteFunction({ 
    functionId: command.functionId,
    cloudConfig
  });

  if (result.success) {
    await logger({
      level: "info",
      message: `Function deleted successfully`,
      context: { functionId: command.functionId },
    });
  } else {
    await logger({
      level: "error",
      message: `Function deletion failed: ${result.error}`,
      context: { functionId: command.functionId },
    });
  }

  return result;
};

export type { DeleteFunctionInput, DeleteFunctionResult };
