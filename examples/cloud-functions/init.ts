/**
 * SotaJS Cloud Functions: Environment Initialization
 * 
 * This script checks and sets up the required environment variables
 * for working with Yandex Cloud.
 * 
 * Usage:
 * bun run examples/cloud-functions/init.ts
 * 
 * Or with OAuth token:
 * YC_OAUTH_TOKEN=xxx bun run examples/cloud-functions/init.ts
 */

import { resetDI } from "../../lib";
import { core } from "./cloud-functions.composition";
import { initCloudCommand } from "./application/commands";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { YandexCloudCliAdapter } from "./infrastructure/adapters/yandex-cloud-cli.adapter";

async function runInit() {
  console.log("🔧 SotaJS Cloud Functions: Environment Initialization\n");
  console.log("=".repeat(60));

  const OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN;
  const FOLDER_ID = process.env.YC_FOLDER_ID;

  // Initialize core with adapters
  resetDI();
  core.bindFeatures(({ cloudFunctions, identity, ycCli }) => {
    identity.bind(
      class extends YandexIdentityAdapter {
        constructor() {
          super("cloud-profiles.sqlite");
        }
      },
    );

    cloudFunctions.bind(
      class extends YandexCloudAdapter {
        constructor() {
          super({
            folderId: FOLDER_ID || "default",
            oauthToken: OAUTH_TOKEN,
          });
        }
      },
    );

    ycCli.bind(YandexCloudCliAdapter);
  });

  // Run initialization
  const result = await initCloudCommand({
    oauthToken: OAUTH_TOKEN,
    folderId: FOLDER_ID,
    profileName: "default",
    auto: true,
  });

  if (!result.success) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ Initialization failed");
    console.log("=".repeat(60));
    console.log(`\nError: ${result.error}`);
    console.log(`Failed at step: ${result.step}\n`);
    process.exit(1);
  }

  console.log("\n✅ Environment is ready for cloud functions deployment!\n");
}

runInit().catch((err: any) => {
  console.error("💥 Fatal Error during initialization:", err);
  process.exit(1);
});
