import { execSync } from "child_process";
import { FeaturePorts } from "../../../../lib";
import { YcCliFeature } from "./ports/yc-cli-feature";
import { YcConfig } from "./ports/yc-cli.ports";

/**
 * Yandex Cloud CLI Adapter
 * 
 * Provides infrastructure operations via yc CLI
 */
export class YandexCloudCliAdapter implements FeaturePorts<typeof YcCliFeature> {
  checkYcCli(): { installed: boolean; configured: boolean } {
    try {
      // Check if yc is installed
      execSync("which yc", { stdio: "pipe" });
      
      // Check if configured (has token)
      const config = execSync("yc config list", { encoding: "utf8", stdio: "pipe" });
      const hasToken = config.includes("token:");
      
      return {
        installed: true,
        configured: hasToken,
      };
    } catch {
      return {
        installed: false,
        configured: false,
      };
    }
  }

  getYcConfig(): YcConfig {
    try {
      const config = execSync("yc config list", { encoding: "utf8", stdio: "pipe" });
      
      const token = this.extractConfigValue(config, "token:");
      const folderId = this.extractConfigValue(config, "folder-id:");
      const cloudId = this.extractConfigValue(config, "cloud-id:");
      
      return {
        token: token || undefined,
        folderId: folderId || undefined,
        cloudId: cloudId || undefined,
      };
    } catch {
      return {};
    }
  }

  listFolders(token: string): Array<{ id: string; name: string }> {
    try {
      const output = execSync(
        `yc resource-manager folder list --format json`,
        { encoding: "utf8", stdio: "pipe" }
      );
      
      const folders = JSON.parse(output);
      return (folders as any[]).map(f => ({
        id: f.id,
        name: f.name,
      }));
    } catch (error: any) {
      console.error("Failed to list folders:", error.message);
      return [];
    }
  }

  async getIamToken(oauthToken: string): Promise<string> {
    try {
      const response = await fetch("https://iam.api.cloud.yandex.net/iam/v1/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ yandexPassportOauthToken: oauthToken }),
      });
      
      if (!response.ok) {
        throw new Error(`IAM API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.iamToken;
    } catch (error: any) {
      console.error("Failed to get IAM token:", error.message);
      throw error;
    }
  }

  async validateToken(oauthToken: string): Promise<{ valid: boolean; subject?: string }> {
    try {
      // Try to get IAM token using OAuth - this is the real validation
      const iamToken = await this.getIamToken(oauthToken);

      // If we got an IAM token, the OAuth token is valid
      if (iamToken && iamToken.length > 0) {
        return {
          valid: true,
          subject: "authenticated",
        };
      }

      return { valid: false };
    } catch (error: any) {
      // Log the actual error for debugging
      console.log(`   Token validation error: ${error.message}`);
      return {
        valid: false,
      };
    }
  }

  private extractConfigValue(config: string, key: string): string | null {
    const match = config.match(new RegExp(`${key}\\s*([^\\s]+)`));
    return match ? match[1] : null;
  }
}
