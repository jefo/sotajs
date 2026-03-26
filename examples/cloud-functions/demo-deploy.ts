/**
 * SotaJS Cloud Functions: Deployment Demo Script
 *
 * This script demonstrates the complete lifecycle of a cloud function:
 * 1. Deploy a function
 * 2. List functions to verify it exists
 * 3. Delete the function
 * 4. List functions to verify it's gone
 *
 * Usage:
 * YC_OAUTH_TOKEN=xxx YC_FOLDER_ID=yyy bun run examples/cloud-functions/demo-deploy.ts
 */

import { resetDI } from "../../lib";
import { core } from "./cloud-functions.composition";
import {
	saveProfileCommand,
	deployFunctionCommand,
	deleteFunctionCommand,
} from "./application/commands";
import { listFunctionsQuery } from "./application/queries";
import { YandexIdentityAdapter } from "./infrastructure/adapters/yandex-identity.adapter";
import { YandexCloudAdapter } from "./infrastructure/adapters/yandex-cloud.adapter";
import { join } from "path";

async function runDemo() {
	console.log("🚀 SotaJS Cloud Functions: Deployment Demo\n");
	console.log("=".repeat(60));

	const OAUTH_TOKEN = process.env.YC_OAUTH_TOKEN;
	const FOLDER_ID = process.env.YC_FOLDER_ID;

	if (!OAUTH_TOKEN || !FOLDER_ID) {
		console.log(
			"❌ Error: Please set YC_OAUTH_TOKEN and YC_FOLDER_ID environment variables.",
		);
		console.log("\nExample:");
		console.log(
			"YC_OAUTH_TOKEN=y0_AgAAAA... YC_FOLDER_ID=b1g... bun run examples/cloud-functions/demo-deploy.ts\n",
		);
		process.exit(1);
	}

	// Initialize core with adapters
	resetDI();
	core.bindFeatures(({ cloudFunctions, identity }) => {
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
						folderId: FOLDER_ID,
						oauthToken: OAUTH_TOKEN,
					});
				}
			},
		);
	});

	const PROFILE_NAME = "demo-profile";
	const FUNCTION_NAME = `sotajs-demo-${Date.now().toString().slice(-6)}`;
	const SOURCE_PATH = join(process.cwd(), "examples/demo-project/index.ts");

	let functionId: string | null = null;

	try {
		// ============================================
		// STEP 0: Setup Profile
		// ============================================
		console.log("\n📦 Step 0: Saving cloud profile to local database...");
		await saveProfileCommand({
			name: PROFILE_NAME,
			oauthToken: OAUTH_TOKEN,
			folderId: FOLDER_ID,
		});
		console.log(`✅ Profile '${PROFILE_NAME}' saved successfully.\n`);

		// ============================================
		// STEP 1: Deploy Function
		// ============================================
		console.log("☁  Step 1: Deploying cloud function...");
		console.log(`   Name: ${FUNCTION_NAME}`);
		console.log(`   Runtime: nodejs18`);
		console.log(`   Memory: 128 MB`);
		console.log(`   Public Access: enabled\n`);

		const deployStartTime = Date.now();
		const deployResult = await deployFunctionCommand({
			name: FUNCTION_NAME,
			profileName: PROFILE_NAME,
			runtime: "nodejs18",
			entrypoint: "index.handler",
			memory: 128,
			executionTimeout: 5,
			makePublic: true,
			sourcePath: SOURCE_PATH,
		});

		if (!deployResult.success) {
			throw new Error(`Deployment failed: ${deployResult.error}`);
		}

		const deployDuration = ((Date.now() - deployStartTime) / 1000).toFixed(1);
		functionId = deployResult.functionId;

		console.log(`✅ Deployment successful in ${deployDuration}s`);
		console.log(`   Function ID: ${functionId}`);
		console.log(`   Version: ${deployResult.version}`);
		if (deployResult.url) {
			console.log(`   Public URL: ${deployResult.url}`);
		}
		console.log();

		// ============================================
		// STEP 2: List Functions (Verify Exists)
		// ============================================
		console.log("📋 Step 2: Listing all functions in folder...");
		const listResult1 = await listFunctionsQuery({ profileName: PROFILE_NAME });

		console.log(`   Total functions: ${listResult1.totalCount}`);
		console.log("\n   Functions:");

		const ourFunction = listResult1.functions.find((f) => f.id === functionId);
		if (ourFunction) {
			console.log(`   ✅ FOUND: ${ourFunction.name} (${ourFunction.id})`);
			console.log(`      Status: ${ourFunction.status}`);
			console.log(`      Runtime: ${ourFunction.runtime}`);
			if (ourFunction.url) {
				console.log(`      URL: ${ourFunction.url}`);
			}
		} else {
			console.log(`   ❌ ERROR: Function ${functionId} not found in list!`);
		}
		console.log();

		// ============================================
		// STEP 3: Delete Function
		// ============================================
		console.log("🗑  Step 3: Deleting the function...");
		console.log(`   Function ID: ${functionId}`);

		const deleteStartTime = Date.now();
		const deleteResult = await deleteFunctionCommand({
			functionId: functionId,
			profileName: PROFILE_NAME,
		});

		if (!deleteResult.success) {
			throw new Error(`Deletion failed: ${deleteResult.error}`);
		}

		const deleteDuration = ((Date.now() - deleteStartTime) / 1000).toFixed(1);
		console.log(`✅ Function deleted successfully in ${deleteDuration}s\n`);

		// ============================================
		// STEP 4: List Functions (Verify Gone)
		// ============================================
		console.log("📋 Step 4: Listing all functions again (verification)...");
		const listResult2 = await listFunctionsQuery({ profileName: PROFILE_NAME });

		console.log(`   Total functions: ${listResult2.totalCount}`);

		const stillExists = listResult2.functions.some((f) => f.id === functionId);
		if (stillExists) {
			console.log(`   ❌ ERROR: Function ${functionId} still exists!`);
		} else {
			console.log(`   ✅ VERIFIED: Function ${functionId} is gone`);
		}
		console.log();

		// ============================================
		// SUMMARY
		// ============================================
		console.log("=".repeat(60));
		console.log("🎉 DEMO COMPLETED SUCCESSFULLY!");
		console.log("=".repeat(60));
		console.log("\nSummary:");
		console.log(`  ✅ Deployed: ${FUNCTION_NAME}`);
		console.log(`  ✅ Verified: Function appeared in list`);
		console.log(`  ✅ Deleted: Function removed`);
		console.log(`  ✅ Verified: Function no longer in list`);
		console.log("\nAll operations completed successfully! 🚀\n");
	} catch (error: any) {
		console.log("\n" + "=".repeat(60));
		console.log("❌ DEMO FAILED");
		console.log("=".repeat(60));
		console.log(`\nError: ${error.message}`);
		console.log("\nStack trace:");
		console.log(error.stack);

		// Cleanup if function was created but deletion failed
		if (functionId) {
			console.log("\n!  Attempting cleanup...");
			try {
				await deleteFunctionCommand({
					functionId: functionId,
					profileName: PROFILE_NAME,
				});
				console.log("✅ Cleanup successful");
			} catch (cleanupError: any) {
				console.log(`❌ Cleanup failed: ${cleanupError.message}`);
				console.log(
					"!  Manual cleanup may be required in Yandex Cloud Console",
				);
			}
		}

		process.exit(1);
	}
}

runDemo();
