import { z } from "zod";
import { usePort } from "../../../../lib";
import {
  checkYcCliPort,
  getYcConfigPort,
  listFoldersPort,
  validateTokenPort,
  getIamTokenPort,
} from "../../infrastructure/ports/yc-cli.ports";
import { saveProfileCommand } from "./save-profile.command";

/**
 * Command: Initialize cloud environment
 * 
 * Checks yc CLI installation, validates tokens, and helps setup configuration
 */

const InitInputSchema = z.object({
  oauthToken: z.string().optional(),
  folderId: z.string().optional(),
  profileName: z.string().default("default"),
  auto: z.boolean().default(false), // Auto-mode: don't prompt for selection
});

type InitInput = z.infer<typeof InitInputSchema>;

export type InitResult =
  | {
      success: true;
      profileName: string;
      folderId: string;
      cloudId: string;
      message: string;
    }
  | {
      success: false;
      error: string;
      step: "cli_check" | "token_validation" | "folder_selection" | "profile_save";
    };

export const initCloudCommand = async (
  input: InitInput = { profileName: "default", auto: false }
): Promise<InitResult> => {
  const command = InitInputSchema.parse(input);

  const checkYcCli = usePort(checkYcCliPort);
  const getYcConfig = usePort(getYcConfigPort);
  const listFolders = usePort(listFoldersPort);
  const validateToken = usePort(validateTokenPort);
  const getIamToken = usePort(getIamTokenPort);

  console.log("🔍 Initializing cloud environment...\n");

  // Step 1: Check yc CLI
  console.log("📦 Step 1: Checking Yandex Cloud CLI...");
  const cliStatus = checkYcCli();

  if (!cliStatus.installed) {
    console.log("❌ Yandex Cloud CLI is not installed.");
    console.log("\n📚 Installation instructions:");
    console.log("   curl -sSL https://storage.yandexcloud.net/yandex-cloud-cli/latest/yc.sh | bash");
    console.log("\n   Or visit: https://yandex.cloud/docs/cli/quickstart\n");
    return {
      success: false,
      error: "Yandex Cloud CLI is not installed",
      step: "cli_check",
    };
  }

  console.log(`✅ YC CLI is installed`);
  if (cliStatus.configured) {
    console.log(`✅ YC CLI is configured\n`);
  } else {
    console.log(`⚠️  YC CLI is not configured (no token found)\n`);
  }

  // Step 2: Get or validate OAuth token
  console.log("🔑 Step 2: Validating OAuth token...");
  
  let oauthToken = command.oauthToken;
  
  // Try to get token from environment
  if (!oauthToken) {
    oauthToken = process.env.YC_OAUTH_TOKEN;
  }
  
  // Try to get token from yc config
  if (!oauthToken && cliStatus.configured) {
    const ycConfig = getYcConfig();
    oauthToken = ycConfig.token;
  }

  if (!oauthToken) {
    console.log("❌ OAuth token not found.");
    console.log("\n📚 How to get OAuth token:");
    console.log("   1. Visit: https://oauth.yandex.ru/authorize?response_type=token&client_id=1a699f511260fe6582d1");
    console.log("   2. Copy the token from the redirect URL");
    console.log("   3. Set YC_OAUTH_TOKEN environment variable\n");
    console.log("   Or run: export YC_OAUTH_TOKEN=<your-token>\n");
    return {
      success: false,
      error: "OAuth token not found",
      step: "token_validation",
    };
  }

  // Validate token
  const validationResult = await validateToken(oauthToken);
  
  if (!validationResult.valid) {
    console.log("❌ OAuth token is invalid or expired.");
    return {
      success: false,
      error: "OAuth token is invalid",
      step: "token_validation",
    };
  }

  console.log(`✅ Token is valid`);
  if (validationResult.subject) {
    console.log(`   Subject: ${validationResult.subject}`);
  }
  console.log();

  // Step 3: Get or select folder
  console.log("📁 Step 3: Getting folder information...");
  
  let folderId = command.folderId;
  
  // Try to get folder from environment
  if (!folderId) {
    folderId = process.env.YC_FOLDER_ID;
  }
  
  // Try to get folder from yc config
  if (!folderId && cliStatus.configured) {
    const ycConfig = getYcConfig();
    folderId = ycConfig.folderId;
  }

  // List folders to validate
  const folders = listFolders(oauthToken);
  
  if (folders.length === 0) {
    console.log("❌ No folders found in your cloud.");
    console.log("\n📚 Create a folder:");
    console.log("   yc resource-manager folder create --name default\n");
    return {
      success: false,
      error: "No folders found",
      step: "folder_selection",
    };
  }

  // If folder not specified, use first one or prompt
  if (!folderId) {
    if (command.auto || folders.length === 1) {
      folderId = folders[0].id;
      console.log(`   Using folder: ${folders[0].name} (${folders[0].id})`);
    } else {
      console.log("\n   Available folders:");
      folders.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name} (${f.id})`);
      });
      console.log(`\n   Enter folder number (1-${folders.length}): `);
      // In auto mode or non-interactive, just use first folder
      folderId = folders[0].id;
      console.log(`   Auto-selected: ${folders[0].name} (${folders[0].id})`);
    }
  } else {
    // Validate folder exists
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      console.log(`❌ Folder ${folderId} not found.`);
      return {
        success: false,
        error: `Folder ${folderId} not found`,
        step: "folder_selection",
      };
    }
    console.log(`   Using folder: ${folder.name} (${folder.id})`);
  }
  console.log();

  // Step 4: Save profile
  console.log("💾 Step 4: Saving cloud profile...");
  
  try {
    await saveProfileCommand({
      name: command.profileName,
      oauthToken,
      folderId,
    });
    
    console.log(`✅ Profile '${command.profileName}' saved successfully.\n`);
  } catch (error: any) {
    console.log(`❌ Failed to save profile: ${error.message}\n`);
    return {
      success: false,
      error: error.message,
      step: "profile_save",
    };
  }

  // Get cloud ID from folder
  const cloudId = await (async () => {
    try {
      const iamToken = await getIamToken(oauthToken);
      const response = await fetch(
        `https://resource-manager.api.cloud.yandex.net/resource-manager/v1/folders/${folderId}`,
        {
          headers: {
            "Authorization": `Bearer ${iamToken}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.cloudId;
      }
    } catch {}
    return "unknown";
  })();

  console.log("=".repeat(60));
  console.log("🎉 Cloud environment initialized successfully!");
  console.log("=".repeat(60));
  console.log(`\nProfile: ${command.profileName}`);
  console.log(`Folder ID: ${folderId}`);
  console.log(`Cloud ID: ${cloudId}`);
  console.log(`\nYou can now use: YC_OAUTH_TOKEN=<token> YC_FOLDER_ID=${folderId} bun run demo-deploy.ts\n`);

  return {
    success: true,
    profileName: command.profileName,
    folderId,
    cloudId,
    message: "Cloud environment initialized",
  };
};
