import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { resetDI } from "../../lib";
import { core } from "./cloud-functions.composition";
import { registerCommand, loginCommand } from "./application/commands";
import { verifyTokenPort, getCloudSessionPort } from "./infrastructure/ports/identity.ports";
import { usePort } from "../../lib";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { unlinkSync, existsSync } from "fs";

describe("Yandex Identity System", () => {
  const TEST_DB = "test-identities.sqlite";

  beforeEach(() => {
    resetDI();

    // Re-bind features manually after resetDI()
    core.bindFeatures(({ identity }) => {
      identity.bind(class extends YandexIdentityAdapter {
        constructor() {
          super(TEST_DB);
        }
      });
    });
  });

  afterEach(() => {
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  it("should register a new user successfully", async () => {
    const result = await registerCommand({
      email: "test@sotajs.dev",
      password: "password123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.identityId).toBeDefined();
    }
  });

  it("should store and retrieve cloud credentials", async () => {
    await registerCommand({
      email: "cloud@sotajs.dev",
      password: "password",
      metadata: {
        ycToken: "fake-oauth-token",
        ycFolder: "fake-folder-id"
      }
    });

    const loginResult = await loginCommand({
      email: "cloud@sotajs.dev",
      password: "password",
    });

    if (!loginResult.success) throw new Error("Login failed");

    const getCloudSession = usePort(getCloudSessionPort);
    const session = await getCloudSession({ token: loginResult.token });

    expect(session).toBeDefined();
    expect(session?.oauthToken).toBe("fake-oauth-token");
    expect(session?.folderId).toBe("fake-folder-id");
  });

  it("should not allow duplicate emails", async () => {
    await registerCommand({
      email: "dup@sotajs.dev",
      password: "password123",
    });

    const result = await registerCommand({
      email: "dup@sotajs.dev",
      password: "password123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
    }
  });

  it("should login successfully with correct credentials", async () => {
    await registerCommand({
      email: "login@sotajs.dev",
      password: "secure_password",
    });

    const result = await loginCommand({
      email: "login@sotajs.dev",
      password: "secure_password",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
      expect(result.token.startsWith("sota_yc_")).toBe(true);
    }
  });

  it("should reject login with wrong password", async () => {
    await registerCommand({
      email: "wrong_pass@sotajs.dev",
      password: "correct_password",
    });

    const result = await loginCommand({
      email: "wrong_pass@sotajs.dev",
      password: "wrong_password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid password");
    }
  });

  it("should verify a valid token", async () => {
    await registerCommand({
      email: "verify@sotajs.dev",
      password: "password",
    });

    const loginResult = await loginCommand({
      email: "verify@sotajs.dev",
      password: "password",
    });

    if (!loginResult.success) throw new Error("Login failed");

    const verifyToken = usePort(verifyTokenPort);
    const verification = await verifyToken({ token: loginResult.token });

    expect(verification.isValid).toBe(true);
    expect(verification.identity?.email).toBe("verify@sotajs.dev");
  });

  it("should reject invalid tokens", async () => {
    const verifyToken = usePort(verifyTokenPort);
    const verification = await verifyToken({ token: "invalid_token" });

    expect(verification.isValid).toBe(false);
  });
});
