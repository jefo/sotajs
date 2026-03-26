import { core } from "./cloud-functions.composition";
import { saveProfileCommand, deployFunctionCommand } from "./application/commands";

/**
 * SotaJS Cloud: Demo Deployment Launcher
 * 
 * Использование:
 * YC_OAUTH_TOKEN=xxx YC_FOLDER_ID=yyy bun run examples/cloud-functions/index.ts
 */

async function runDemo() {
  console.log("🚀 SotaJS Cloud Functions: Demo Deployment Starting...\n");

  const OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN;
  const FOLDER_ID = process.env.YC_FOLDER_ID;

  if (!OAUTH_TOKEN || !FOLDER_ID) {
    console.log("❌ Error: Please set YC_OAUTH_TOKEN and YC_FOLDER_ID environment variables.");
    console.log("Example:");
    console.log("YC_OAUTH_TOKEN=y0_AgAAAA... YC_FOLDER_ID=b1g... bun run examples/cloud-functions/index.ts\n");
    process.exit(1);
  }

  // 1. Настройка профиля (Инкапсуляция кредов в SQLite)
  console.log("📦 Step 1: Saving cloud profile to local database...");
  await saveProfileCommand({
    name: "main",
    oauthToken: OAUTH_TOKEN,
    folderId: FOLDER_ID
  });
  console.log("✅ Profile 'main' saved successfully.\n");

  // 2. Деплой реальной функции (Public Webhook Concept)
  const functionName = `sotajs-hello-world`;
  console.log(`☁️  Step 2: Deploying public function '${functionName}'...`);
  
  const startTime = Date.now();
  const result = await deployFunctionCommand({
    name: functionName,
    profileName: "main",
    runtime: "nodejs18",
    entrypoint: "index.handler",
    memory: 128,
    executionTimeout: 5,
    makePublic: true, // Ключевой момент для веб-хука!
    code: `
export const handler = async (event) => {
  console.log("Request received at:", new Date().toISOString());
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Hello from SotaJS Cloud Functions! 🚀",
      timestamp: new Date().toISOString(),
      status: "LIVE",
      managedBy: "SotaJS"
    })
  };
};
`
  });

  if (result.success) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 SUCCESS! Deployment completed in ${duration}s`);
    console.log(`🔗 Public URL: ${result.url}`);
    console.log(`🆔 Function ID: ${result.functionId}`);
    console.log("\nCopy the URL above and open it in your browser or hit it with curl!");
  } else {
    console.log(`\n❌ Deployment Failed: ${result.error}`);
  }
}

runDemo().catch(err => {
  console.error("💥 Fatal Error during demo:", err);
});
