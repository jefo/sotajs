#!/usr/bin/env bun
/**
 * SotaJS CLI: Deploy Command
 *
 * Deploy functions to Yandex Cloud with sota.yml configuration
 *
 * Usage:
 *   bun run sota-deploy.ts [options]
 *   bun run sota-deploy.ts --function=bot
 *   bun run sota-deploy.ts --config=./custom.yml
 */

import { resetDI } from "../../lib";
import { core } from "./cloud-functions.composition";
import { deployFunctionCommand } from "./application/commands";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { YandexCloudCliAdapter } from "./infrastructure/adapters/yandex-cloud-cli.adapter";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import YAML from "js-yaml";

// Type definitions
type SotaConfig = {
  service: string;
  provider: {
    name: string;
    runtime: string;
    memorySize: number;
    timeout: string | number;
    folderId?: string;
    oauthToken?: string;
  };
  functions: Record<string, {
    handler?: string;
    name: string;
    entrypoint?: string;
    environment?: Record<string, string>;
    memory?: number;
    timeout?: string | number;
    runtime?: string;
  }>;
};

function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      result[key] = value !== undefined ? value : true;
    }
  }
  
  return result;
}

function resolveEnvValue(value: string): string {
  if (value.startsWith("${env:")) {
    const envVar = value.match(/\$\{env:(\w+)\}/)?.[1];
    if (envVar) {
      return process.env[envVar] || "";
    }
  }
  return value;
}

function loadConfig(configPath: string): SotaConfig {
  const absolutePath = resolve(configPath);
  
  if (!existsSync(absolutePath)) {
    throw new Error(`Configuration file not found: ${absolutePath}`);
  }
  
  const content = readFileSync(absolutePath, "utf-8");
  const config = YAML.load(content) as SotaConfig;
  
  // Resolve environment variables
  if (config.provider.oauthToken) {
    config.provider.oauthToken = resolveEnvValue(config.provider.oauthToken);
  }
  if (config.provider.folderId) {
    config.provider.folderId = resolveEnvValue(config.provider.folderId);
  }
  
  for (const fn of Object.values(config.functions)) {
    if (fn.environment) {
      for (const [key, value] of Object.entries(fn.environment)) {
        fn.environment[key] = resolveEnvValue(value);
      }
    }
  }
  
  return config;
}

function parseTimeout(timeout: string | number): number {
  if (typeof timeout === "number") return timeout;
  if (typeof timeout === "string") {
    if (timeout.endsWith("s")) return parseInt(timeout.slice(0, -1));
    return parseInt(timeout);
  }
  return 10;
}

async function deployFunctionFromConfig(
  config: SotaConfig,
  functionName: string,
  baseDir: string
) {
  const fnConfig = config.functions[functionName];
  if (!fnConfig) {
    throw new Error(`Function '${functionName}' not found in config`);
  }
  
  const provider = config.provider;
  const sourcePath = fnConfig.handler 
    ? resolve(baseDir, fnConfig.handler)
    : resolve(baseDir, `${functionName}.js`);
  
  console.log(`📦 Deploying: ${functionName}`);
  console.log(`   Name: ${fnConfig.name}`);
  console.log(`   Handler: ${fnConfig.handler || "N/A"}`);
  console.log(`   Runtime: ${fnConfig.runtime || provider.runtime}`);
  console.log(`   Memory: ${fnConfig.memory || provider.memorySize} MB`);
  console.log(`   Timeout: ${parseTimeout(fnConfig.timeout || provider.timeout)}s`);
  
  const environment = fnConfig.environment || {};
  if (Object.keys(environment).length > 0) {
    console.log(`   Environment:`);
    for (const [key, value] of Object.entries(environment)) {
      console.log(`     ${key}: ${value.slice(0, 10)}${value.length > 10 ? "..." : ""}`);
    }
  }
  
  try {
    const runtimeValue = (fnConfig.runtime || provider.runtime) as "nodejs16" | "nodejs18" | "nodejs20" | "python39" | "python310" | "go121";
    
    const result = await deployFunctionCommand({
      name: fnConfig.name,
      profileName: "default",
      runtime: runtimeValue,
      entrypoint: fnConfig.entrypoint || "index.handler",
      memory: fnConfig.memory || provider.memorySize,
      executionTimeout: parseTimeout(fnConfig.timeout || provider.timeout),
      makePublic: true,
      sourcePath,
      environment,
    });
    
    return result;
  } catch (error: any) {
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  // Config path
  const configPath = (args["config"] as string) || "sota.yml";
  const absoluteConfigPath = resolve(configPath);
  const baseDir = dirname(absoluteConfigPath);
  
  // Load configuration
  let config: SotaConfig;
  try {
    config = loadConfig(configPath);
    console.log("🚀 SotaJS Deploy\n");
    console.log("=".repeat(50));
    console.log(`📄 Config: ${configPath}`);
    console.log(`📦 Service: ${config.service}`);
    console.log(`☁️  Provider: ${config.provider.name}`);
    console.log();
  } catch (error: any) {
    console.error(`❌ Error loading config: ${error.message}`);
    process.exit(1);
  }
  
  // Validate provider config
  const provider = config.provider;
  if (!provider.oauthToken && !process.env.YC_OAUTH_TOKEN) {
    console.error("❌ Error: oauthToken required in provider or YC_OAUTH_TOKEN env");
    process.exit(1);
  }
  if (!provider.folderId && !process.env.YC_FOLDER_ID) {
    console.error("❌ Error: folderId required in provider or YC_FOLDER_ID env");
    process.exit(1);
  }
  
  // Use env vars as fallback
  const oauthToken = provider.oauthToken || process.env.YC_OAUTH_TOKEN!;
  const folderId = provider.folderId || process.env.YC_FOLDER_ID!;
  
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
    const startTime = Date.now();
    const functionNames = args["function"] 
      ? [(args["function"] as string)]
      : Object.keys(config.functions);
    
    const results: Array<{ name: string; success: boolean; functionId?: string; url?: string }> = [];
    
    for (const fnName of functionNames) {
      console.log("─".repeat(50));
      
      try {
        const result = await deployFunctionFromConfig(config, fnName, baseDir);
        
        if (result.success) {
          console.log(`✅ ${fnName} deployed successfully`);
          console.log(`   Function ID: ${result.functionId}`);
          console.log(`   Version: ${result.version}`);
          if (result.url) {
            console.log(`   URL: ${result.url}`);
          }
          results.push({ name: fnName, success: true, functionId: result.functionId, url: result.url });
        } else {
          console.error(`❌ ${fnName} deployment failed: ${result.error}`);
          results.push({ name: fnName, success: false });
        }
      } catch (error: any) {
        console.error(`❌ ${fnName} deployment failed: ${error.message}`);
        results.push({ name: fnName, success: false });
      }
      
      console.log();
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Summary
    console.log("=".repeat(50));
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      console.log(`🎉 All ${totalCount} function(s) deployed successfully in ${duration}s!`);
    } else {
      console.log(`⚠️  ${successCount}/${totalCount} functions deployed successfully`);
    }
    
    console.log("\nDeployed functions:");
    for (const result of results) {
      if (result.success) {
        console.log(`  ✅ ${result.name}: ${result.url || result.functionId}`);
      } else {
        console.log(`  ❌ ${result.name}: FAILED`);
      }
    }
    
    // Setup Telegram webhook if bot was deployed
    const botResult = results.find(r => r.name === "bot" || r.name.includes("bot"));
    if (botResult?.success && botResult.url) {
      console.log("\n" + "=".repeat(50));
      console.log("🔗 Setting up Telegram webhook...");
      
      const botToken = process.env.BOT_TOKEN;
      if (botToken) {
        try {
          const webhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${botResult.url}`;
          const response = await fetch(webhookUrl);
          const tgResult: any = await response.json();
          
          if (tgResult.ok) {
            console.log("✅ Telegram webhook configured successfully!");
            console.log(`   Webhook URL: ${botResult.url}`);
          } else {
            console.log(`⚠️  Failed to set webhook: ${tgResult.description}`);
          }
        } catch (error: any) {
          console.log(`⚠️  Error setting webhook: ${error.message}`);
        }
      } else {
        console.log("⚠️  BOT_TOKEN not set. Skipping webhook setup.");
        console.log("   Set BOT_TOKEN env var to auto-configure webhook.");
      }
    }
    
    console.log();
    
    if (successCount < totalCount) {
      process.exit(1);
    }
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
