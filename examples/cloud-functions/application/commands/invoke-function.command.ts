import { z } from "zod";
import { usePort } from "../../../../lib";
import { CloudFunction } from "../../domain/function.aggregate";
import {
  invokeFunctionPort,
  getFunctionPort,
  loggerPort,
} from "../../infrastructure/ports/cloud.ports";

/**
 * Command: Invoke a cloud function
 */

const InvokeFunctionInputSchema = z.object({
  functionId: z.string().uuid(),
  payload: z.object({}).passthrough().optional(),
});

type InvokeFunctionInput = z.infer<typeof InvokeFunctionInputSchema>;

type InvokeFunctionResult =
  | { success: true; response: any; executionTime: number }
  | { success: false; error: string };

export const invokeFunctionCommand = async (
  input: InvokeFunctionInput
): Promise<InvokeFunctionResult> => {
  const command = InvokeFunctionInputSchema.parse(input);

  const invokeFunction = usePort(invokeFunctionPort);
  const getFunction = usePort(getFunctionPort);
  const logger = usePort(loggerPort);

  // Get function metadata
  const funcData = await getFunction({ functionId: command.functionId });

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
    message: `Invoking function '${funcData.name}'`,
    context: {
      functionId: command.functionId,
      runtime: funcData.runtime,
    },
  });

  // Invoke function
  const result = await invokeFunction({
    functionId: command.functionId,
    payload: command.payload,
  });

  if (result.success) {
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

    // Emit invocation event
    func.actions.invoke(result.executionTime, result.success);
    const events = func.getPendingEvents();

    for (const event of events) {
      await logger({
        level: "info",
        message: `Domain event: ${event.constructor.name}`,
        context: {
          aggregateId: event.aggregateId,
          executionTime: result.executionTime,
        },
      });
    }

    await logger({
      level: "info",
      message: `Function invoked successfully`,
      context: {
        functionId: command.functionId,
        executionTime: result.executionTime,
      },
    });
  } else {
    await logger({
      level: "error",
      message: `Function invocation failed: ${result.error}`,
      context: { functionId: command.functionId },
    });
  }

  return result;
};

export type { InvokeFunctionInput, InvokeFunctionResult };
