#!/usr/bin/env bun
/**
 * SotaJS CLI: Deploy Command
 *
 * Simple deployment tool for Yandex Cloud Functions
 *
 * Usage:
 *   sota deploy <function.js> --name=my-function --folder=<FOLDER_ID> --token=<YC_OAUTH_TOKEN>
 *
 * Options:
 *   --name        Function name (required)
 *   --folder      Yandex Cloud Folder ID (required)
 *   --token       Yandex OAuth Token (required, or set YC_OAUTH_TOKEN env)
 *   --runtime     Runtime version (default: nodejs18)
 *   --memory      Memory limit in MB (default: 128)
 *   --timeout     Execution timeout in seconds (default: 10)
 *   --env         Environment variables (format: KEY=value, can be repeated)
 *   --public      Make function public (default: true)
 */

import { resetDI } from "../../lib";
import { core } from "./cloud-functions.composition";
import { deployFunctionCommand } from "./application/commands";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { YandexCloudCliAdapter } from "./infrastructure/adapters/yandex-cloud-cli.adapter";
import { resolve } from "path";

function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      result[key] = value !== undefined ? value : true;
    } else if (!arg.startsWith("-")) {
      result["_"] = arg;
    }
  }
  
  return result;
}

function parseEnvVars(envStrings: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  
  for (const envStr of envStrings) {
    const [key, ...valueParts] = envStr.split("=");
    if (key && valueParts.length > 0) {
      env[key] = valueParts.join("=");
    }
  }
  
  return env;
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);
  
  // Positional argument: function file
  const functionFile = parsed["_"] as string;
  
  // Required options
  const name = parsed["name"] as string;
  const folderId = (parsed["folder"] as string) || process.env.YC_FOLDER_ID;
  const oauthToken = (parsed["token"] as string) || process.env.YC_OAUTH_TOKEN;
  
  // Optional parameters
  const runtime = (parsed["runtime"] as string) || "nodejs18";
  const memory = parseInt(parsed["memory"] as string || "128");
  const timeout = parseInt(parsed["timeout"] as string || "10");
  const makePublic = parsed["public"] !== "false";
  
  // Environment variables
  const envArgs = Array.isArray(parsed["env"]) 
    ? parsed["env"] as string[]
    : parsed["env"] 
      ? [parsed["env"] as string]
      : [];
  const environment = parseEnvVars(envArgs);
  
  // Validation
  if (!functionFile) {
    console.error("❌ Error: Function file is required");
    console.error("\nUsage: sota deploy <function.js> --name=my-function --folder=<FOLDER_ID> --token=<TOKEN>");
    process.exit(1);
  }
  
  if (!name) {
    console.error("❌ Error: --name is required");
    console.error("\nUsage: sota deploy <function.js> --name=my-function --folder=<FOLDER_ID> --token=<TOKEN>");
    process.exit(1);
  }
  
  if (!folderId) {
    console.error("❌ Error: --folder or YC_FOLDER_ID env is required");
    console.error("\nUsage: sota deploy <function.js> --name=my-function --folder=<FOLDER_ID> --token=<TOKEN>");
    process.exit(1);
  }
  
  if (!oauthToken) {
    console.error("❌ Error: --token or YC_OAUTH_TOKEN env is required");
    console.error("\nUsage: sota deploy <function.js> --name=my-function --folder=<FOLDER_ID> --token=<TOKEN>");
    process.exit(1);
  }

  // Resolve function file path
  const sourcePath = resolve(functionFile);

  console.log("🚀 SotaJS Deploy\n");
  console.log("=".repeat(50));
  
  // Initialize core with adapters
  resetDI();
  core.bindFeatures(({ cloudFunctions, identity, ycCli }) => {
    identity.bind(
      class extends YandexIdentityAdapter {
        constructor() {
          super("cloud-profiles.sqlite");
        }
      },
    );
    
    cloudFunctions.bind(
      class extends YandexCloudAdapter {
        constructor() {
          super({
            folderId,
            oauthToken,
          });
        }
      },
    );
    
    ycCli.bind(YandexCloudCliAdapter);
  });
  
  try {
    // Deploy
    console.log(`📦 Deploying: ${functionFile}`);
    console.log(`   Name: ${name}`);
    console.log(`   Runtime: ${runtime}`);
    console.log(`   Memory: ${memory} MB`);
    console.log(`   Timeout: ${timeout}s`);
    console.log(`   Public: ${makePublic ? "yes" : "no"}`);
    
    if (Object.keys(environment).length > 0) {
      console.log(`   Environment:`);
      for (const [key, value] of Object.entries(environment)) {
        console.log(`     ${key}: ${value.slice(0, 10)}${value.length > 10 ? "..." : ""}`);
      }
    }
    
    console.log();
    
    const startTime = Date.now();
    const result = await deployFunctionCommand({
      name,
      profileName: "default",
      runtime,
      entrypoint: "index.handler",
      memory,
      executionTimeout: timeout,
      makePublic: makePublic,
      sourcePath,
      environment,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!result.success) {
      console.error(`❌ Deployment failed: ${result.error}`);
      process.exit(1);
    }
    
    console.log("✅ Deployment successful!");
    console.log(`   Duration: ${duration}s`);
    console.log(`   Function ID: ${result.functionId}`);
    console.log(`   Version: ${result.version}`);
    
    if (result.url) {
      console.log(`   Public URL: ${result.url}`);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Done!\n");
  } catch (error: any) {
    console.error("\n❌ Deployment failed");
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
