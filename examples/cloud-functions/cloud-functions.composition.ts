import { defineCore } from "../../lib";
import { CloudFunctionFeature } from "./infrastructure/ports/cloud-feature";
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
  cloudFunctions.bind(YandexCloudAdapter);
});

export type AppCore = typeof core;
