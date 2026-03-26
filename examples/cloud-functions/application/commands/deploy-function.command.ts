import { z } from "zod";
import { usePort } from "../../../../lib";
import { CloudFunction } from "../../domain/function.aggregate";
import { deployFunctionPort, loggerPort } from "../ports";
import { getProfilePort } from "../../infrastructure/ports/identity.ports";

/**
 * Command: Deploy a cloud function using a profile (Control Plane Logic)
 */

const DeployFunctionInputSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Name must contain only lowercase letters, numbers, and hyphens"),
  runtime: z.enum(["nodejs16", "nodejs18", "nodejs20", "python39", "python310", "go121"]),
  entrypoint: z.string().min(1),
  memory: z.number().refine((m) => m >= 128 && m <= 4096, "Memory must be 128-4096 MB"),
  executionTimeout: z.number().refine((t) => t >= 1 && t <= 600, "Timeout must be 1-600 seconds"),
  sourcePath: z.string().min(1, "Source path cannot be empty"),
  code: z.string().optional(), // Optional - for inline code (future feature)
  environment: z.record(z.string()).optional(),
  serviceAccountId: z.string().optional(),
  makePublic: z.boolean().optional(),
  profileName: z.string().optional(),
});

type DeployFunctionInput = z.infer<typeof DeployFunctionInputSchema>;

type DeployFunctionResult =
  | { success: true; functionId: string; version: string; url?: string }
  | { success: false; error: string };

export const deployFunctionCommand = async (
  input: DeployFunctionInput
): Promise<DeployFunctionResult> => {
  const command = DeployFunctionInputSchema.parse(input);

  const deployFunction = usePort(deployFunctionPort);
  const logger = usePort(loggerPort);
  const getProfile = usePort(getProfilePort);

  let cloudConfig: { oauthToken?: string; serviceAccountKey?: string; folderId: string } | undefined;

  if (command.profileName) {
    const profile = await getProfile(command.profileName);
    if (profile) {
      cloudConfig = {
        oauthToken: profile.oauthToken,
        serviceAccountKey: profile.serviceAccountKey,
        folderId: profile.folderId,
      };
    }
  }

  // Деплой через инфраструктуру
  const result = await deployFunction({
    ...command,
    cloudConfig,
  });

  if (result.success) {
    // В будущем здесь можно добавить сохранение метаданных деплоя в локальную БД SotaJS
    await logger({
      level: "info",
      message: `Function '${command.name}' is LIVE!`,
      context: { url: result.url },
    });
  } else {
    await logger({
      level: "error",
      message: `Deployment failed: ${result.error}`,
    });
  }

  return result;
};

export type { DeployFunctionInput, DeployFunctionResult };
