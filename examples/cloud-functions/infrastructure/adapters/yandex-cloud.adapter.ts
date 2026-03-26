import {
  Session,
  serviceClients,
  waitForOperation,
  decodeMessage
} from "@yandex-cloud/nodejs-sdk";
import {
  Function,
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/functions/v1/function";
import {
  CreateFunctionRequest,
  CreateFunctionVersionRequest,
  GetFunctionRequest,
  ListFunctionsRequest,
  DeleteFunctionRequest,
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/functions/v1/function_service";
import { 
  SetAccessBindingsRequest 
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/access/access";
import { FeaturePorts } from "../../../../lib";

import { execSync } from "child_process";
import { path } from "path";
import { CloudFunctionFeature } from "../../application/ports/cloud-feature";
import { 
  DeleteFunctionInput, 
  DeleteFunctionResult, 
  DeployFunctionInput, 
  DeployFunctionResult, 
  GetFunctionInput, 
  InvokeFunctionInput, 
  InvokeFunctionResult, 
  ListFunctionsInput, 
  ListFunctionsResult 
} from "../../application";
import { FunctionDto } from "../../application/ports";

/**
 * Yandex Cloud Adapter: Data Plane
 * 
 * Handles real bundling, zipping and Yandex Cloud SDK communication.
 */
 
// конфиг должен сохраняться в файл по известному местоположению нашгим приложением минуя CLI - то есть init мы сделаем сами
export class YandexCloudAdapter implements FeaturePorts<typeof CloudFunctionFeature> {
  private defaultSession: Session;
  private defaultFolderId: string;


  constructor(config: { folderId: string; oauthToken?: string; authKeyJson?: string }) {
     // TODO: this should be loaded from ~/.config/yandex-cloud/config.yaml (путь зависит от ОС)
    this.defaultFolderId = config.folderId;
    if (config.authKeyJson) {
      this.defaultSession = new Session({ authKeyJson: JSON.parse(config.authKeyJson) });
    } else {
      this.defaultSession = new Session({ oauthToken: config.oauthToken });
    }
  }

  private getSession(cloudConfig?: { oauthToken?: string; serviceAccountKey?: string; folderId: string }) {
    if (cloudConfig) {
      if (cloudConfig.serviceAccountKey) {
        return {
          session: new Session({ authKeyJson: JSON.parse(cloudConfig.serviceAccountKey) }),
          folderId: cloudConfig.folderId,
        };
      }
      return {
        session: new Session({ oauthToken: cloudConfig.oauthToken }),
        folderId: cloudConfig.folderId,
      };
    }
    return { session: this.defaultSession, folderId: this.defaultFolderId };
  }

  private getClient(session: Session) {
    return session.client(serviceClients.FunctionServiceClient);
  }

  async deployFunction(input: DeployFunctionInput): Promise<DeployFunctionResult> {
    const { session, folderId } = this.getSession(input.cloudConfig);
    const client = this.getClient(session);

    try {
      console.log(`☁️  [SotaJS Cloud] Deploying function '${input.name}'...`);

      // 1. Поиск или создание функции
      let functionId = await this.findFunctionIdByName(input.name, session, folderId);

      if (!functionId) {
        console.log(`🔨 [SotaJS Cloud] Creating function resource in folder ${folderId}...`);
        const createOp = await client.create(CreateFunctionRequest.fromPartial({
          folderId,
          name: input.name,
          labels: { "managed-by": "sotajs-cloud" }
        }));
        const resultOp = await waitForOperation(createOp, session);
        if (resultOp.error) throw new Error(resultOp.error.message);
        functionId = decodeMessage(resultOp.response!).id;
      }

      // 2. Установка публичного доступа
      if (input.makePublic) {
        console.log(`🔓 [SotaJS Cloud] Enabling public access...`);
        await client.setAccessBindings(SetAccessBindingsRequest.fromPartial({
          resourceId: functionId!,
          accessBindings: [{
            roleId: "functions.invoker",
            subject: { id: "allUsers", type: "system" }
          }]
        }));
      }

      // 3. Сборка проекта через Bun.build (DX Level: High)
      console.log(`📦 [SotaJS Cloud] Bundling source: ${input.sourcePath}`);
      const zipBuffer = await this.createZipBuffer(input.sourcePath);

      // 4. Создание версии
      console.log(`🚀 [SotaJS Cloud] Uploading version...`);
      const versionOp = await client.createVersion(CreateFunctionVersionRequest.fromPartial({
        functionId: functionId!,
        runtime: input.runtime,
        entrypoint: input.entrypoint,
        resources: { memory: input.memory * 1024 * 1024 },
        executionTimeout: { seconds: input.executionTimeout, nanos: 0 },
        serviceAccountId: input.serviceAccountId,
        content: zipBuffer,
        environment: input.environment || {},
      }));

      const resultVersionOp = await waitForOperation(versionOp, session);
      if (resultVersionOp.error) throw new Error(resultVersionOp.error.message);

      const createdVersion = decodeMessage(resultVersionOp.response!);
      const finalFunc = await client.get(GetFunctionRequest.fromPartial({ functionId: functionId! }));

      return {
        success: true,
        functionId: functionId!,
        version: createdVersion.id,
        url: finalFunc.httpGatewayUrl
      };
    } catch (error: any) {
      console.error(`❌ [SotaJS Cloud] Deployment failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async invokeFunction(input: InvokeFunctionInput): Promise<InvokeFunctionResult> {
    return { success: false, error: "Use public URL for invocation." };
  }

  async getFunction(input: GetFunctionInput): Promise<FunctionDto | null> {
    const { session } = this.getSession(input.cloudConfig);
    const client = this.getClient(session);
    try {
      const func = await client.get(GetFunctionRequest.fromPartial({ functionId: input.functionId }));
      
      // Return basic DTO - we don't need version details for simple operations
      return {
        id: func.id,
        name: func.name,
        runtime: (func.runtime as any) || "nodejs18",
        entrypoint: "",
        memory: 128,
        executionTimeout: 5,
        code: "",
        environment: {},
        status: "active",
        version: "",
        createdAt: func.createdAt!,
        updatedAt: func.createdAt!,
        url: func.httpGatewayUrl
      };
    } catch { return null; }
  }

  async listFunctions(input: ListFunctionsInput): Promise<ListFunctionsResult> {
    const { session, folderId } = this.getSession(input.cloudConfig);
    const client = this.getClient(session);
    const targetFolderId = input.folderId || folderId;
    const response = await client.list(ListFunctionsRequest.fromPartial({ folderId: targetFolderId }));
    const functions = (response.functions || []).map(f => this.mapToDto(f));
    return { functions, totalCount: functions.length };
  }

  async deleteFunction(input: DeleteFunctionInput): Promise<DeleteFunctionResult> {
    const { session } = this.getSession(input.cloudConfig);
    const client = this.getClient(session);
    try {
      const op = await client.delete(DeleteFunctionRequest.fromPartial({ functionId: input.functionId }));
      const result = await waitForOperation(op, session);
      if (result.error) throw new Error(result.error.message);
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async logger(input: { level: string; message: string; context?: any }): Promise<void> {
    const emoji = input.level === 'error' ? '❌' : 'ℹ️';
    console.log(`${emoji} [${input.level.toUpperCase()}] ${input.message}`, input.context || "");
  }

  private async findFunctionIdByName(name: string, session: Session, folderId: string): Promise<string | null> {
    const client = this.getClient(session);
    const response = await client.list(ListFunctionsRequest.fromPartial({ folderId }));
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
      url: f.httpGatewayUrl
    };
  }

  private async mapToDtoWithVersion(f: Function, session: Session): Promise<FunctionDto> {
    // Get the function versions to extract entrypoint, memory, timeout
    const client = this.getClient(session);
    
    let entrypoint = "";
    let memory = 128;
    let executionTimeout = 5;
    let version = "";
    
    try {
      // List versions of this function
      const response = await client.list(ListFunctionsRequest.fromPartial({ functionId: f.id }));
      
      if (response.functions && response.functions.length > 0) {
        const latestVersion = response.functions[0];
        entrypoint = latestVersion.entrypoint || "";
        memory = latestVersion.resources?.memory ? latestVersion.resources.memory / (1024 * 1024) : 128;
        executionTimeout = latestVersion.executionTimeout?.seconds || 5;
        version = latestVersion.id || "";
      }
    } catch (e) {
      console.log("Could not get function versions, using defaults");
    }

    return {
      id: f.id,
      name: f.name,
      runtime: f.runtime as any,
      entrypoint,
      memory,
      executionTimeout,
      code: "", // Code is not retrievable from YC API
      environment: {},
      status: "active",
      version,
      createdAt: f.createdAt!,
      updatedAt: f.createdAt!,
      url: f.httpGatewayUrl
    };
  }

  private async createZipBuffer(sourcePath: string): Promise<Uint8Array> {
    const tempDir = `/tmp/yc-deploy-${Date.now()}`;
    execSync(`mkdir -p ${tempDir}`);
    
    // Бандлим все зависимости в один файл index.js
    const buildResult = await Bun.build({
      entrypoints: [sourcePath],
      outdir: tempDir,
      naming: "index.js",
      target: "node",
      minify: false,
    });

    if (!buildResult.success) {
      throw new Error(`Bundling failed: ${buildResult.logs.map(l => l.message).join(", ")}`);
    }
    
    await Bun.write(`${tempDir}/package.json`, JSON.stringify({ type: "module" }));
    execSync(`cd ${tempDir} && zip -q -r function.zip index.js package.json`);

    const zipFile = Bun.file(`${tempDir}/function.zip`);
    const arrayBuffer = await zipFile.arrayBuffer();
    execSync(`rm -rf ${tempDir}`);
    return new Uint8Array(arrayBuffer);
  }
}
