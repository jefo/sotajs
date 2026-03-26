import { defineCore } from "../../lib";
import { CloudFunctionFeature } from "./application/ports/cloud-feature";
import { IdentityFeature } from "./infrastructure/ports/identity-feature";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";

/**
 * Composition Root: Application assembly
 */

// Define application core
export const core = defineCore({
  cloudFunctions: CloudFunctionFeature,
  identity: IdentityFeature,
});

// Bind feature to adapter
core.bindFeatures(({ cloudFunctions, identity }) => {
  cloudFunctions.bind(class extends YandexCloudAdapter {
    constructor() {
      super({
        folderId: process.env.YC_FOLDER_ID || "default",
        // TODO: this should be loaded from ~/.config/yandex-cloud/config.yaml (путь зависит от ОС)
        oauthToken: process.env.YC_OAUTH_TOKEN,
        iamToken: process.env.YC_IAM_TOKEN,
      });
    }
  });

  identity.bind(class extends YandexIdentityAdapter {
    constructor() {
      super("cloud-profiles.sqlite");
    }
  });
});

export type AppCore = typeof core;
