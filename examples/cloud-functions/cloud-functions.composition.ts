import { defineCore } from "../../lib";
import { CloudFunctionFeature } from "./application/ports/cloud-feature";
import { IdentityFeature } from "./infrastructure/ports/identity-feature";
import { YcCliFeature } from "./infrastructure/ports/yc-cli-feature";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudCliAdapter } from "./infrastructure/adapters/yandex-cloud-cli.adapter";

/**
 * Composition Root: Application assembly
 */

// Define application core
export const core = defineCore({
  cloudFunctions: CloudFunctionFeature,
  identity: IdentityFeature,
  ycCli: YcCliFeature,
});

// Bind feature to adapter
core.bindFeatures(({ cloudFunctions, identity, ycCli }) => {
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

  ycCli.bind(YandexCloudCliAdapter);
});

export type AppCore = typeof core;
