import { saveProfileCommand, deployFunctionCommand } from "./application/commands";
import { resolve } from "path";

/**
 * SotaJS Cloud CLI: Professional Deployment Workflow
 * 
 * Commands:
 * 1. Link provider: bun run sota-cloud.ts link --name prod --folder b1g... --key ./yandex-key.json
 * 2. Deploy project: bun run sota-cloud.ts ./my-bot/index.ts --profile prod --name my-bot --public
 */

const [,, command, ...args] = process.argv;

async function run() {
  if (command === "link") {
    const name = getArg("--name") || "default";
    const folder = getArg("--folder");
    const keyPath = getArg("--key");
    const oauth = getArg("--token");

    if (!folder) {
      console.log("❌ Error: --folder is required.");
      process.exit(1);
    }

    let serviceAccountKey;
    if (keyPath) {
      serviceAccountKey = await Bun.file(resolve(keyPath)).text();
    }

    await saveProfileCommand({
      name,
      folderId: folder,
      serviceAccountKey,
      oauthToken: oauth
    });
    console.log(`✅ Provider '${name}' successfully linked to SotaJS Cloud Registry.`);
    return;
  }

  // Дефолтная команда или явный 'deploy'
  if (command === "deploy" || (command && !command.startsWith("-"))) {
    const sourceFile = command === "deploy" ? args[0] : command;
    if (!sourceFile) {
      console.log("❌ Error: source file path is required.");
      process.exit(1);
    }

    const sourcePath = resolve(sourceFile);
    const profile = getArg("--profile") || "default";
    const name = getArg("--name") || "sota-function";
    const isPublic = process.argv.includes("--public");

    console.log(`🚀 SotaJS Cloud: Preparing deployment for '${name}'...`);
    
    const result = await deployFunctionCommand({
      name,
      sourcePath,
      profileName: profile,
      runtime: "nodejs18",
      entrypoint: "index.handler",
      memory: 128,
      executionTimeout: 10,
      makePublic: isPublic
    });

    if (result.success) {
      console.log(`\n🎉 SUCCESS! Your project is now LIVE in the Cloud.`);
      console.log(`🔗 Public URL: ${result.url}`);
      console.log(`🆔 Function ID: ${result.functionId}`);
    } else {
      console.log(`\n❌ Deployment Failed: ${result.error}`);
    }
    return;
  }

  showHelp();
}

function getArg(name: string) {
  const idx = args.indexOf(name);
  return idx > -1 && args[idx + 1] && !args[idx+1].startsWith("-") ? args[idx + 1] : undefined;
}

function showHelp() {
  console.log("SotaJS Cloud CLI ☁️");
  console.log("\nUsage:");
  console.log("  link   --folder <id> [--name <name>] [--key <file>] [--token <token>]");
  console.log("  deploy <file> [--profile <name>] [--name <func-name>] [--public]");
  console.log("\nExamples:");
  console.log("  bun run sota-cloud.ts link --folder b1g... --key ./key.json");
  console.log("  bun run sota-cloud.ts ./bot.ts --public");
}

run().catch(err => {
  console.error("💥 Fatal CLI Error:", err.message);
});
