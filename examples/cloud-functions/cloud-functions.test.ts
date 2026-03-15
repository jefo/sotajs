import { describe, it, expect, beforeEach } from "bun:test";
import { CloudFunction, FunctionDeployedEvent } from "./domain/function.aggregate";
import {
  deployFunctionCommand,
  invokeFunctionCommand,
  deleteFunctionCommand,
  getFunctionQuery,
  listFunctionsQuery,
} from "./application";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { CloudFunctionFeature } from "./infrastructure/ports/cloud-feature";
import { defineCore, resetDI } from "../../lib";

/**
 * Tests for Cloud Functions PoC
 *
 * Tests cover:
 * - Domain model invariants
 * - Commands and Queries logic
 * - Yandex Cloud adapter integration
 */

// ============================================================================
// Domain Tests: CloudFunction Aggregate
// ============================================================================

describe("CloudFunction Aggregate", () => {
  const validFunctionData = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "hello-world",
    runtime: "nodejs18" as const,
    entrypoint: "index.handler",
    memory: 128,
    executionTimeout: 30,
    code: `
      export const handler = async (event) => ({
        statusCode: 200,
        body: JSON.stringify({ message: 'Hello!' })
      });
    `,
    environment: { NODE_ENV: "production" },
    status: "active" as const,
    version: "1.0.0",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should create function in active state", () => {
    const func = CloudFunction.create(validFunctionData);

    expect(func.props.status).toBe("active");
    expect(func.props.version).toBe("1.0.0");
    expect(func.isReady).toBe(true);
  });

  it("should deploy new version", () => {
    const func = CloudFunction.create(validFunctionData);

    const newCode = `export const handler = async () => ({ statusCode: 201 });`;
    func.actions.deploy(newCode, "1.1.0");

    expect(func.props.code).toBe(newCode);
    expect(func.props.version).toBe("1.1.0");
    expect(func.props.status).toBe("active");

    const events = func.getPendingEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(FunctionDeployedEvent);
  });

  it("should reject deploy when deleting", () => {
    const func = CloudFunction.create(validFunctionData);
    func.actions.markForDeletion();

    expect(() => func.actions.deploy("new code", "1.1.0")).toThrow(
      "Cannot deploy function that is being deleted"
    );
  });

  it("should invoke function and track execution", () => {
    const func = CloudFunction.create(validFunctionData);

    func.actions.invoke(150, true);

    const events = func.getPendingEvents();
    expect(events.length).toBe(1);
    expect(events[0].aggregateId).toBe(func.id);
  });

  it("should reject invoke when not active", () => {
    const func = CloudFunction.create({
      ...validFunctionData,
      status: "error" as const,
    });

    expect(() => func.actions.invoke(100, true)).toThrow(
      "Cannot invoke function with status: error"
    );
  });

  it("should mark for deletion", () => {
    const func = CloudFunction.create(validFunctionData);

    func.actions.markForDeletion();

    expect(func.props.status).toBe("deleting");
    expect(func.canBeDeleted).toBe(false);
  });

  it("should enforce valid function name", () => {
    const invalidData = {
      ...validFunctionData,
      name: "Invalid_Name!",
    };

    expect(() => CloudFunction.create(invalidData)).toThrow();
  });

  it("should enforce valid memory range", () => {
    const invalidData = {
      ...validFunctionData,
      memory: 64, // Below minimum
    };

    expect(() => CloudFunction.create(invalidData)).toThrow();
  });

  it("should compute runtime family", () => {
    const nodeFunc = CloudFunction.create(validFunctionData);
    expect(nodeFunc.runtimeFamily).toBe("nodejs");

    const pythonFunc = CloudFunction.create({
      ...validFunctionData,
      runtime: "python39",
    });
    expect(pythonFunc.runtimeFamily).toBe("python");

    const goFunc = CloudFunction.create({
      ...validFunctionData,
      runtime: "go121",
    });
    expect(goFunc.runtimeFamily).toBe("go");
  });
});

// ============================================================================
// Application Tests: Commands & Queries
// ============================================================================

describe("Cloud Functions Commands & Queries", () => {
  beforeEach(() => {
    resetDI();

    const core = defineCore({
      cloudFunctions: CloudFunctionFeature,
    });

    core.bindFeatures(({ cloudFunctions }) => {
      cloudFunctions.bind(YandexCloudAdapter);
    });
  });

  it("should deploy function successfully", async () => {
    const result = await deployFunctionCommand({
      name: "test-function-deploy",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 256,
      executionTimeout: 60,
      code: `
        module.exports.handler = async (event) => ({
          statusCode: 200,
          body: JSON.stringify({ message: 'Hello from test!' })
        });
      `,
      environment: { TEST_ENV: "true" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.functionId).toBeDefined();
      expect(result.version).toBe("1.0.0");
    }
  });

  it("should reject duplicate function name", async () => {
    await deployFunctionCommand({
      name: "duplicate-function",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `export const handler = async () => ({ statusCode: 200 });`,
      environment: {},
    });

    const result = await deployFunctionCommand({
      name: "duplicate-function",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `export const handler = async () => ({ statusCode: 201 });`,
      environment: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
    }
  });

  it("should invoke deployed function", async () => {
    const deployResult = await deployFunctionCommand({
      name: "invokable-function",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `
        module.exports.handler = async (event) => ({
          statusCode: 200,
          body: JSON.stringify({ received: event })
        });
      `,
      environment: {},
    });

    if (!deployResult.success) throw new Error("Deploy failed");

    const invokeResult = await invokeFunctionCommand({
      functionId: deployResult.functionId,
      payload: { name: "test" },
    });

    expect(invokeResult.success).toBe(true);
    if (invokeResult.success) {
      expect(invokeResult.response).toBeDefined();
      expect(invokeResult.executionTime).toBeGreaterThanOrEqual(0);
    }
  });

  it("should reject invoke for non-existent function", async () => {
    const result = await invokeFunctionCommand({
      functionId: "00000000-0000-0000-0000-000000000000",
      payload: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("should get function by ID", async () => {
    const deployResult = await deployFunctionCommand({
      name: "gettable-function",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `export const handler = async () => ({ statusCode: 200 });`,
      environment: {},
    });

    if (!deployResult.success) throw new Error("Deploy failed");

    const getResult = await getFunctionQuery({
      functionId: deployResult.functionId,
    });

    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.function.name).toBe("gettable-function");
      expect(getResult.function.runtime).toBe("nodejs18");
    }
  });

  it("should return error for non-existent function", async () => {
    const result = await getFunctionQuery({
      functionId: "00000000-0000-0000-0000-000000000000",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("should list all functions", async () => {
    await deployFunctionCommand({
      name: "function-one",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `export const handler = async () => ({ statusCode: 200 });`,
      environment: {},
    });

    await deployFunctionCommand({
      name: "function-two",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 256,
      executionTimeout: 60,
      code: `export const handler = async () => ({ statusCode: 201 });`,
      environment: {},
    });

    const result = await listFunctionsQuery({});

    expect(result.totalCount).toBe(2);
    expect(result.functions.length).toBe(2);
  });

  it("should list functions filtered by status", async () => {
    await deployFunctionCommand({
      name: "active-function",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `export const handler = async () => ({ statusCode: 200 });`,
      environment: {},
    });

    const result = await listFunctionsQuery({ status: "active" });

    expect(result.functions.every((f) => f.status === "active")).toBe(true);
  });

  it("should delete function", async () => {
    const deployResult = await deployFunctionCommand({
      name: "deletable-function",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 30,
      code: `export const handler = async () => ({ statusCode: 200 });`,
      environment: {},
    });

    if (!deployResult.success) throw new Error("Deploy failed");

    const deleteResult = await deleteFunctionCommand({
      functionId: deployResult.functionId,
    });

    expect(deleteResult.success).toBe(true);

    // Verify function is deleted
    const getResult = await getFunctionQuery({
      functionId: deployResult.functionId,
    });

    expect(getResult.success).toBe(false);
  });

  it("should reject delete for non-existent function", async () => {
    const result = await deleteFunctionCommand({
      functionId: "00000000-0000-0000-0000-000000000000",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });
});
