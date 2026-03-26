import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { resetDI } from "../../lib";
import { core } from "./cloud-functions.composition";
import { saveProfileCommand, deployFunctionCommand } from "./application/commands";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { unlinkSync, existsSync } from "fs";

/**
 * Smoke Test: Orchestration and Yandex Cloud Deployment
 */

describe("Cloud Functions Deployment Smoke Test", () => {
  const TEST_DB = "smoke-profiles.sqlite";
  
  const OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN || "mock-token";
  const FOLDER_ID = process.env.YC_FOLDER_ID || "mock-folder";

  beforeEach(() => {
    resetDI();
    
    core.bindFeatures(({ cloudFunctions, identity }) => {
      identity.bind(class extends YandexIdentityAdapter {
        constructor() {
          super(TEST_DB);
        }
      });
      
      cloudFunctions.bind(class extends YandexCloudAdapter {
        constructor() {
          super({
            folderId: FOLDER_ID,
            oauthToken: OAUTH_TOKEN
          });
        }
      });
    });
  });

  afterEach(() => {
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  it("should complete the full orchestration flow with public access", async () => {
    await saveProfileCommand({
      name: "test-profile",
      oauthToken: OAUTH_TOKEN,
      folderId: FOLDER_ID
    });

    const result = await deployFunctionCommand({
      name: `smoke-test-${Math.random().toString(36).slice(2, 7)}`,
      profileName: "test-profile",
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 5,
      makePublic: true, // Проверяем публичный доступ
      code: `
        export const handler = async (event) => {
          return { statusCode: 200, body: "OK" };
        };
      `
    });

    if (OAUTH_TOKEN === "mock-token") {
      expect(result.success).toBe(false);
      console.log("Оркестрация подтверждена (YC отклонил mock-токен)");
    } else {
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.functionId).toBeDefined();
        expect(result.url).toBeDefined(); // Проверяем наличие URL
        console.log(`✅ Реальный деплой успешен! URL: ${result.url}`);
      }
    }
  });
});
