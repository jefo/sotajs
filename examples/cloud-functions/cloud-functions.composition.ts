import { defineCore } from "../../lib";
import { CloudFunctionFeature } from "./application/ports/cloud-feature";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";

/**
 * Composition Root: Application assembly
 *
 * Here we define the core and bind features to adapters
 */

// Define application core
export const core = defineCore({
  cloudFunctions: CloudFunctionFeature,
});

// Bind feature to adapter
core.bindFeatures(({ cloudFunctions }) => {
  cloudFunctions.bind(class extends YandexCloudAdapter {
    constructor() {
      super({
        folderId: process.env.YC_FOLDER_ID || "default",
        oauthToken: process.env.YC_OAUTH_TOKEN,
        iamToken: process.env.YC_IAM_TOKEN,
      });
    }
  });
});

export type AppCore = typeof core;
