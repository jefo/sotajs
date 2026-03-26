import { defineFeature } from "../../../../lib";
import {
  checkYcCliPort,
  getYcConfigPort,
  listFoldersPort,
  getIamTokenPort,
  validateTokenPort,
} from "./yc-cli.ports";

/**
 * YcCli Feature: Yandex Cloud CLI operations
 */
export const YcCliFeature = defineFeature({
  checkYcCli: checkYcCliPort,
  getYcConfig: getYcConfigPort,
  listFolders: listFoldersPort,
  getIamToken: getIamTokenPort,
  validateToken: validateTokenPort,
});
