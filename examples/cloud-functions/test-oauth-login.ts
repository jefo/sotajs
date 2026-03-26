/**
 * Hypothesis Test: Automatic OAuth Token Interception via Puppeteer
 * 
 * This script tests the ability to automatically capture OAuth token
 * after user login through browser automation.
 * 
 * Usage:
 * bun run test-oauth-login.ts
 */

import puppeteer from "puppeteer";

async function loginAndGetToken(): Promise<string | null> {
  console.log("🌐 Opening browser for Yandex OAuth...\n");

  // Official Yandex Cloud OAuth URL with public client_id
  const authUrl =
    "https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb";

  // Find system browser
  const systemBrowsers = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/firefox",
    "/usr/bin/firefox-esr",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Firefox.app/Contents/MacOS/firefox",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  ];

  const fs = await import("fs");
  let executablePath: string | undefined;

  for (const path of systemBrowsers) {
    try {
      if (fs.existsSync(path)) {
        executablePath = path;
        console.log(`🌍 Found system browser: ${path}`);
        break;
      }
    } catch {}
  }

  if (!executablePath) {
    console.error("❌ No system browser found!");
    console.error("\n💡 Please install Chrome, Chromium, or Firefox:");
    console.error("   - Ubuntu/Debian: sudo apt install chromium-browser");
    console.error("   - Fedora: sudo dnf install chromium");
    console.error("   - macOS: brew install --cask google-chrome");
    console.error("   - Or run: npx puppeteer browsers install chrome\n");
    return null;
  }

  // Launch system browser in VISIBLE mode
  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    defaultViewport: null,
    args: [
      "--window-size=1024,768",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--start-maximized",
    ],
  });

  const page = await browser.newPage();

  try {
    console.log("📍 Navigating to OAuth page...");
    await page.goto(authUrl, { waitUntil: "networkidle2" });

    console.log(
      "👤 Please login in the opened browser window...\n" +
        "   (Enter your Yandex login, password, and SMS code if required)\n"
    );

    // Wait for URL to contain 'access_token=' (max 5 minutes)
    console.log("⏳ Waiting for successful authentication...");
    await page.waitForFunction(
      () => window.location.href.includes("access_token="),
      { timeout: 300000 } // 5 minutes
    );

    // Get final URL with token
    const finalUrl = page.url();
    console.log("\n🔗 Redirect URL captured!");

    // Parse token from URL hash
    // Example: https://oauth.yandex.ru/verification_code#access_token=y0_AgA...&token_type=bearer...
    const hash = finalUrl.split("#")[1];
    if (!hash) {
      throw new Error("No hash found in URL");
    }

    const params = new URLSearchParams(hash);
    const token = params.get("access_token");

    if (!token) {
      throw new Error("access_token not found in URL");
    }

    console.log("\n✅ Authorization successful!\n");

    return token;
  } catch (error: any) {
    console.error("\n❌ Error or timeout waiting for authorization:");
    console.error(`   ${error.message}`);
    throw error;
  } finally {
    // Close browser
    await browser.close();
    console.log("\n🚪 Browser closed.\n");
  }
}

// Test: After getting token, call Yandex Cloud API to list folders
async function testTokenWithApi(token: string): Promise<void> {
  console.log("🧪 Testing token with Yandex Cloud API...\n");

  try {
    // Get IAM token using OAuth token
    console.log("🔄 Exchanging OAuth token for IAM token...");
    const iamResponse = await fetch(
      "https://iam.api.cloud.yandex.net/iam/v1/tokens",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ yandexPassportOauthToken: token }),
      }
    );

    if (!iamResponse.ok) {
      throw new Error(`IAM API error: ${iamResponse.status}`);
    }

    const iamData = await iamResponse.json();
    const iamToken = iamData.iamToken;
    console.log(`✅ IAM token received: ${iamToken.substring(0, 20)}...\n`);

    // List folders using IAM token
    console.log("📁 Listing folders in your cloud...");
    const foldersResponse = await fetch(
      "https://resource-manager.api.cloud.yandex.net/resource-manager/v1/folders",
      {
        headers: {
          Authorization: `Bearer ${iamToken}`,
        },
      }
    );

    if (!foldersResponse.ok) {
      throw new Error(`Resource Manager API error: ${foldersResponse.status}`);
    }

    const foldersData = await foldersResponse.json();
    const folders = foldersData.folders || [];

    if (folders.length === 0) {
      console.log("⚠️  No folders found in your cloud.\n");
    } else {
      console.log(`✅ Found ${folders.length} folder(s):\n`);
      folders.forEach((f: any) => {
        console.log(`   • ${f.name} (${f.id})`);
      });
      console.log();
    }

    // Test: List functions in first folder
    if (folders.length > 0) {
      const folderId = folders[0].id;
      console.log(`🔍 Listing functions in folder: ${folderId}...\n`);

      const functionsResponse = await fetch(
        `https://serverless.api.cloud.yandex.net/serverless/v1/functions?folderId=${folderId}`,
        {
          headers: {
            Authorization: `Bearer ${iamToken}`,
          },
        }
      );

      if (functionsResponse.ok) {
        const functionsData = await functionsResponse.json();
        const functions = functionsData.functions || [];

        if (functions.length === 0) {
          console.log("   No functions found.\n");
        } else {
          console.log(`✅ Found ${functions.length} function(s):\n`);
          functions.forEach((fn: any) => {
            console.log(`   • ${fn.name} (${fn.id})`);
          });
          console.log();
        }
      } else {
        console.log(`⚠️  Could not list functions: ${functionsResponse.status}\n`);
      }
    }

    console.log("=".repeat(60));
    console.log("🎉 HYPOTHESIS CONFIRMED!");
    console.log("=".repeat(60));
    console.log("\n✅ OAuth token interception works!");
    console.log("✅ IAM token exchange works!");
    console.log("✅ HTTP API calls work!");
    console.log("\n💡 This approach can be implemented in SotaJS CLI.\n");
  } catch (error: any) {
    console.error("\n❌ API test failed:");
    console.error(`   ${error.message}\n`);
    throw error;
  }
}

// Main execution
async function main() {
  console.log("=".repeat(60));
  console.log("🧪 Yandex Cloud OAuth Token Interception Test");
  console.log("=".repeat(60));
  console.log();

  try {
    // Step 1: Get token via browser automation
    const token = await loginAndGetToken();

    if (!token) {
      console.error("❌ Failed to get token");
      process.exit(1);
    }

    console.log("📦 Token received:");
    console.log(`   ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
    console.log();

    // Step 2: Test token with API
    await testTokenWithApi(token);

    // Save token for later use
    console.log("💾 Saving token to .env file...");
    const fs = await import("fs");
    const envPath = "./.env.test";
    fs.writeFileSync(envPath, `YC_OAUTH_TOKEN=${token}\n`);
    console.log(`✅ Token saved to ${envPath}\n`);
  } catch (error: any) {
    console.error("\n💥 Test failed:", error.message);
    process.exit(1);
  }
}

main();
