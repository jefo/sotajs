import { defineFeature } from "../../../../lib";
import {
  deployFunctionPort,
  invokeFunctionPort,
  deleteFunctionPort,
  getFunctionPort,
  listFunctionsPort,
  loggerPort,
} from "./cloud.ports";

/**
 * Define Cloud Functions feature with all its ports
 */
export const CloudFunctionFeature = defineFeature({
  deployFunction: deployFunctionPort,
  invokeFunction: invokeFunctionPort,
  deleteFunction: deleteFunctionPort,
  getFunction: getFunctionPort,
  listFunctions: listFunctionsPort,
  logger: loggerPort,
});
