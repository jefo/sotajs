import { createPort } from "../../../../lib";

export type FunctionDto = {
  id: string;
  name: string;
  runtime: "nodejs16" | "nodejs18" | "nodejs20" | "python39" | "python310" | "go121";
  entrypoint: string;
  memory: number;
  executionTimeout: number;
  code: string;
  environment: Record<string, string>;
  status: "creating" | "active" | "error" | "deleting";
  version: string;
  createdAt: Date;
  updatedAt: Date;
  url?: string; // Публичный URL функции
};

/**
 * Port: Deploy a cloud function
 */

export type DeployFunctionInput = {
  name: string;
  runtime: FunctionDto["runtime"];
  entrypoint: string; // e.g. "index.handler"
  sourcePath: string; // Путь к исходному файлу (например, "./index.ts")
  memory: number; // in MB
  executionTimeout: number; // in seconds
  environment?: Record<string, string>;
  serviceAccountId?: string;
  makePublic?: boolean;
  cloudConfig?: {
    oauthToken: string;
    folderId: string;
  };
};

export type DeployFunctionResult =
  | { success: true; functionId: string; version: string; url?: string }
  | { success: false; error: string };

export const deployFunctionPort = createPort<(input: DeployFunctionInput) => DeployFunctionResult>();

/**
 * Port: Invoke a cloud function
 */

export type InvokeFunctionInput = {
  functionId: string;
  payload?: Record<string, any>;
  cloudConfig?: {
    oauthToken: string;
    folderId: string;
  };
};

export type InvokeFunctionResult =
  | { success: true; response: any; executionTime: number }
  | { success: false; error: string };

export const invokeFunctionPort = createPort<(input: InvokeFunctionInput) => InvokeFunctionResult>();

/**
 * Port: Delete a cloud function
 */

export type DeleteFunctionInput = {
  functionId: string;
  cloudConfig?: {
    oauthToken: string;
    folderId: string;
  };
};

export type DeleteFunctionResult =
  | { success: true }
  | { success: false; error: string };

export const deleteFunctionPort = createPort<(input: DeleteFunctionInput) => DeleteFunctionResult>();

/**
 * Port: Get function details
 */

export type GetFunctionInput = {
  functionId: string;
  cloudConfig?: {
    oauthToken: string;
    folderId: string;
  };
};

export const getFunctionPort = createPort<(input: GetFunctionInput) => FunctionDto | null>();

/**
 * Port: List functions
 */

export type ListFunctionsInput = {
  folderId?: string;
  status?: FunctionDto["status"];
  cloudConfig?: {
    oauthToken: string;
    folderId: string;
  };
};

export type ListFunctionsResult = {
  functions: FunctionDto[];
  totalCount: number;
};

export const listFunctionsPort = createPort<(input: ListFunctionsInput) => ListFunctionsResult>();

/**
 * Port: Logging
 */
export const loggerPort = createPort<(input: { level: 'info' | 'error' | 'warn'; message: string; context?: any }) => void>();
