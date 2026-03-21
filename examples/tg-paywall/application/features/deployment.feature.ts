import { defineFeature } from "../../../../lib";
import { deployPort } from "../ports/deployment.port";

export const DeploymentFeature = defineFeature({
  deploy: deployPort,
});
