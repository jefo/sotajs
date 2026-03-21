import { createPort } from "../../../../lib";

/**
 * Ports: Contracts for cloud functions infrastructure
 */

// ============================================================================
// Command Ports
// ============================================================================

/**
 * Deploy a function to Yandex Cloud
 */
export const deployFunctionPort = createPort<
  (input: DeployFunctionInput) => DeployFunctionResult
>();

/**
 * Invoke a function
 */
export const invokeFunctionPort = createPort<
  (input: InvokeFunctionInput) => InvokeFunctionResult
>();

/**
 * Delete a function
 */
export const deleteFunctionPort = createPort<
  (input: DeleteFunctionInput) => DeleteFunctionResult
>();

// ============================================================================
// Query Ports
// ============================================================================

/**
 * Get function metadata
 */
export const getFunctionPort = createPort<
  (input: GetFunctionInput) => FunctionDto | null
>();

/**
 * List functions with optional filtering
 */
export const listFunctionsPort = createPort<
  (input: ListFunctionsInput) => ListFunctionsResult
>();

// ============================================================================
// Utility Ports
// ============================================================================

/**
 * Logger port
 */
export const loggerPort = createPort<
  (input: {
    level: "info" | "warn" | "error";
    message: string;
    context?: Record<string, any>;
  }) => void
>();

// ============================================================================
// Types
// ============================================================================

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
};
export type DeployFunctionInput = {
  name: string;
  runtime: FunctionDto["runtime"];
  entrypoint: string;
  memory: number;
  executionTimeout: number;
  code: string;
  environment?: Record<string, string>;
};

export type DeployFunctionResult =
  | { success: true; functionId: string; version: string }
  | { success: false; error: string };

export type InvokeFunctionInput = {
  functionId: string;
  payload?: Record<string, any>;
};

export type InvokeFunctionResult =
  | { success: true; response: any; executionTime: number }
  | { success: false; error: string };

export type DeleteFunctionInput = {
  functionId: string;
};

export type DeleteFunctionResult =
  | { success: true }
  | { success: false; error: string };

export type GetFunctionInput = {
  functionId: string;
};

export type ListFunctionsInput = {
  folderId?: string;
  status?: FunctionDto["status"];
};

export type ListFunctionsResult = {
  functions: FunctionDto[];
  totalCount: number;
};
