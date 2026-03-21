import {
  Session,
  serviceClients,
  waitForOperation,
  decodeMessage
} from "@yandex-cloud/nodejs-sdk";
import {
  Function,
  Version
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/functions/v1/function";
import {
  CreateFunctionRequest,
  CreateFunctionVersionRequest,
  GetFunctionRequest,
  ListFunctionsRequest,
  DeleteFunctionRequest
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/functions/v1/function_service";
import { FeaturePorts } from "../../../../lib";

import { execSync } from "child_process";
import { CloudFunctionFeature } from "../../application/ports/cloud-feature";
import { DeleteFunctionInput, DeleteFunctionResult, DeployFunctionInput, DeployFunctionResult, GetFunctionInput, InvokeFunctionInput, InvokeFunctionResult, ListFunctionsInput, ListFunctionsResult } from "../../application";
import { FunctionDto } from "../../application/ports";

/**
 * Real Yandex Cloud Adapter (Node.js SDK v2)
 * 
 * Использует актуальную версию @yandex-cloud/nodejs-sdk.
 */
export class YandexCloudAdapter implements FeaturePorts<typeof CloudFunctionFeature> {
  private session: Session;
  private folderId: string;

  constructor(config: { folderId: string; oauthToken?: string; iamToken?: string }) {
    this.folderId = config.folderId;
    this.session = new Session({
      oauthToken: config.oauthToken,
      iamToken: config.iamToken,
    });
  }

  private get client() {
    return this.session.client(serviceClients.FunctionServiceClient);
  }

  async deployFunction(input: DeployFunctionInput): Promise<DeployFunctionResult> {
    try {
      console.log(`☁️  [YC] Deploying function: ${input.name}...`);

      // 1. Поиск или создание функции
      let functionId = await this.findFunctionIdByName(input.name);

      if (!functionId) {
        console.log(`🔨 [YC] Creating new function '${input.name}'...`);
        const createOp = await this.client.create(CreateFunctionRequest.fromPartial({
          folderId: this.folderId,
          name: input.name,
          description: "Auto-deployed via SotaJS Cloud Functions DX",
          labels: { "managed-by": "sotajs" }
        }));

        const resultOp = await waitForOperation(createOp, this.session);
        if (resultOp.error) throw new Error(resultOp.error.message);

        const createdFunc = decodeMessage(resultOp.response!);
        functionId = createdFunc.id;
        console.log(`✅ [YC] Function created: ${functionId}`);
      }

      // 2. Создание новой версии
      console.log(`📦 [YC] Creating version for ${functionId}...`);
      const zipBuffer = await this.createZipBuffer(input.code);

      const versionOp = await this.client.createVersion(CreateFunctionVersionRequest.fromPartial({
        functionId: functionId!,
        runtime: input.runtime, // Напр. "nodejs18"
        entrypoint: input.entrypoint,
        resources: {
          memory: input.memory * 1024 * 1024, // Конвертируем MB в байты
        },
        executionTimeout: { seconds: input.executionTimeout, nanos: 0 },
        content: zipBuffer,
        environment: input.environment || {},
      }));

      const resultVersionOp = await waitForOperation(versionOp, this.session);

      if (resultVersionOp.error) {
        throw new Error(`Version deployment failed: ${resultVersionOp.error.message}`);
      }

      const createdVersion = decodeMessage(resultVersionOp.response!);
      console.log(`🚀 [YC] Version ${createdVersion.id} is LIVE!`);

      return {
        success: true,
        functionId: functionId!,
        version: createdVersion.id,
      };
    } catch (error: any) {
      console.error(`❌ [YC] Deployment error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async invokeFunction(input: InvokeFunctionInput): Promise<InvokeFunctionResult> {
    return { success: false, error: "Direct invocation via SDK not implemented. Use public web-link." };
  }

  async getFunction(input: GetFunctionInput): Promise<FunctionDto | null> {
    try {
      const func = await this.client.get(GetFunctionRequest.fromPartial({ functionId: input.functionId }));
      return this.mapToDto(func);
    } catch {
      return null;
    }
  }

  async listFunctions(input: ListFunctionsInput): Promise<ListFunctionsResult> {
    const response = await this.client.list(ListFunctionsRequest.fromPartial({ folderId: this.folderId }));
    const functions = (response.functions || []).map(f => this.mapToDto(f));
    return {
      functions,
      totalCount: functions.length,
    };
  }

  async deleteFunction(input: DeleteFunctionInput): Promise<DeleteFunctionResult> {
    try {
      const op = await this.client.delete(DeleteFunctionRequest.fromPartial({ functionId: input.functionId }));
      const result = await waitForOperation(op, this.session);
      if (result.error) throw new Error(result.error.message);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async logger(input: { level: string; message: string; context?: any }): Promise<void> {
    const emoji = input.level === 'error' ? '❌' : 'ℹ️';
    console.log(`${emoji} [${input.level.toUpperCase()}] ${input.message}`, input.context || "");
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private async findFunctionIdByName(name: string): Promise<string | null> {
    const response = await this.client.list(ListFunctionsRequest.fromPartial({ folderId: this.folderId }));
    const found = (response.functions || []).find(f => f.name === name);
    return found ? found.id : null;
  }

  private mapToDto(f: Function): FunctionDto {
    return {
      id: f.id,
      name: f.name,
      runtime: f.runtime as any,
      entrypoint: "",
      memory: 0,
      executionTimeout: 0,
      code: "",
      environment: {},
      status: "active",
      version: "",
      createdAt: f.createdAt!,
      updatedAt: f.createdAt!,
    };
  }

  private async createZipBuffer(code: string): Promise<Uint8Array> {
    const tempDir = `/tmp/yc-deploy-${Date.now()}`;
    execSync(`mkdir -p ${tempDir}`);
    await Bun.write(`${tempDir}/index.js`, code);

    execSync(`cd ${tempDir} && zip -q -r function.zip .`);

    const zipFile = Bun.file(`${tempDir}/function.zip`);
    const arrayBuffer = await zipFile.arrayBuffer();

    execSync(`rm -rf ${tempDir}`);

    return new Uint8Array(arrayBuffer);
  }
}
