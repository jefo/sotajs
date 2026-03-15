import { z } from "zod";
import { usePort } from "../../../../lib";
import { CloudFunction } from "../../domain/function.aggregate";
import {
  deployFunctionPort,
  loggerPort,
} from "../../infrastructure/ports/cloud.ports";

/**
 * Command: Deploy a cloud function
 */

const DeployFunctionInputSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Name must contain only lowercase letters, numbers, and hyphens"),
  runtime: z.enum(["nodejs16", "nodejs18", "nodejs20", "python39", "python310", "go121"]),
  entrypoint: z.string().min(1),
  memory: z.number().refine((m) => m >= 128 && m <= 4096, "Memory must be 128-4096 MB"),
  executionTimeout: z.number().refine((t) => t >= 1 && t <= 600, "Timeout must be 1-600 seconds"),
  code: z.string().min(1, "Code cannot be empty"),
  environment: z.record(z.string()).optional().default({}),
});

type DeployFunctionInput = z.infer<typeof DeployFunctionInputSchema>;

type DeployFunctionResult =
  | { success: true; functionId: string; version: string }
  | { success: false; error: string };

export const deployFunctionCommand = async (
  input: DeployFunctionInput
): Promise<DeployFunctionResult> => {
  const command = DeployFunctionInputSchema.parse(input);

  const deployFunction = usePort(deployFunctionPort);
  const logger = usePort(loggerPort);

  await logger({
    level: "info",
    message: `Deploying function '${command.name}'`,
    context: {
      runtime: command.runtime,
      memory: command.memory,
      timeout: command.executionTimeout,
    },
  });

  // Deploy function via infrastructure
  const result = await deployFunction({
    name: command.name,
    runtime: command.runtime,
    entrypoint: command.entrypoint,
    memory: command.memory,
    executionTimeout: command.executionTimeout,
    code: command.code,
    environment: command.environment,
  });

  if (result.success) {
    // Create domain aggregate for tracking
    const func = CloudFunction.create({
      id: result.functionId,
      name: command.name,
      runtime: command.runtime,
      entrypoint: command.entrypoint,
      memory: command.memory,
      executionTimeout: command.executionTimeout,
      code: command.code,
      status: "active",
      version: result.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Emit deployment event
    func.actions.deploy(command.code, result.version);
    const events = func.getPendingEvents();

    for (const event of events) {
      await logger({
        level: "info",
        message: `Domain event: ${event.constructor.name}`,
        context: { aggregateId: event.aggregateId },
      });
    }

    await logger({
      level: "info",
      message: `Function deployed successfully`,
      context: {
        functionId: result.functionId,
        version: result.version,
      },
    });
  } else {
    await logger({
      level: "error",
      message: `Function deployment failed: ${result.error}`,
      context: { functionName: command.name },
    });
  }

  return result;
};

export type { DeployFunctionInput, DeployFunctionResult };
