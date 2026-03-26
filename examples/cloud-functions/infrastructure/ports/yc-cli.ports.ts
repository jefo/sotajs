import { createPort } from "../../../../lib";

/**
 * Ports: Yandex Cloud CLI operations
 */

export type YcConfig = {
  token?: string;
  folderId?: string;
  cloudId?: string;
};

export type YcProfile = {
  name: string;
  token: string;
  folderId: string;
  cloudId: string;
};

/**
 * Check if yc CLI is installed and configured
 */
export const checkYcCliPort = createPort<() => { installed: boolean; configured: boolean }>();

/**
 * Get current yc configuration
 */
export const getYcConfigPort = createPort<() => YcConfig>();

/**
 * List available folders in cloud
 */
export const listFoldersPort = createPort<(token: string) => Array<{ id: string; name: string }>>();

/**
 * Get IAM token from OAuth token
 */
export const getIamTokenPort = createPort<(oauthToken: string) => Promise<string>>();

/**
 * Validate OAuth token
 */
export const validateTokenPort = createPort<(oauthToken: string) => Promise<{ valid: boolean; subject?: string }>>();
