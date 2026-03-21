import { createPort } from "../../../../lib";

export type DeployInput = {
  name: string;
  entrypoint: string;
  code: string;
  env?: Record<string, string>;
};

export type DeployResult = {
  success: true;
  url: string;
  functionId: string;
} | {
  success: false;
  error: string;
};

export const deployPort = createPort<(input: DeployInput) => Promise<DeployResult>>();
