import { z } from "zod";
import { usePorts } from "../../../../lib";
import { deployPort } from "../ports/deployment.port";
import { loggerPort } from "../ports/paywall.ports";

const DeployCloudFunctionInputSchema = z.object({
  name: z.string(),
  entrypoint: z.string(),
  code: z.string(),
  env: z.record(z.string()).optional(),
});

type DeployCloudFunctionInput = z.infer<typeof DeployCloudFunctionInputSchema>;

/**
 * Command: Развернуть функцию в облаке
 */
export const deployCloudFunctionCommand = async (input: DeployCloudFunctionInput) => {
  const data = DeployCloudFunctionInputSchema.parse(input);
  
  const { deploy, logger } = usePorts({
    deploy: deployPort,
    logger: loggerPort,
  });

  await logger({
    level: "info",
    message: `Initiating cloud deployment for: ${data.name}`,
  });

  const result = await deploy(data);

  if (result.success) {
    await logger({
      level: "info",
      message: `Cloud function ${data.name} deployed successfully`,
      context: { url: result.url },
    });
  } else {
    await logger({
      level: "error",
      message: `Cloud function ${data.name} deployment failed: ${result.error}`,
    });
  }

  return result;
};
