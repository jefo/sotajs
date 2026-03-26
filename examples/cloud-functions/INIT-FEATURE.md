# Cloud Functions: Environment Initialization

## Обзор

Новый `init` use case обеспечивает автоматическую настройку окружения для работы с Yandex Cloud, включая проверку CLI, валидацию токенов и выбор папки.

## Архитектура

### Новые компоненты

#### 1. Infrastructure Ports (`infrastructure/ports/yc-cli.ports.ts`)

```typescript
- checkYcCliPort      // Проверка установки yc CLI
- getYcConfigPort     // Получение текущей конфигурации
- listFoldersPort     // Список папок в облаке
- getIamTokenPort     // Получение IAM токена
- validateTokenPort   // Валидация OAuth токена
```

#### 2. Infrastructure Adapter (`infrastructure/adapters/yandex-cloud-cli.adapter.ts`)

```typescript
YandexCloudCliAdapter implements FeaturePorts<typeof YcCliFeature>
```

Взаимодействует с:
- `yc CLI` через `execSync`
- Yandex Cloud HTTP API через `fetch`

#### 3. Init Command (`application/commands/init-cloud.command.ts`)

```typescript
initCloudCommand(input: InitInput): Promise<InitResult>
```

**Шаги выполнения:**
1. Проверка yc CLI (установлен/настроен)
2. Получение и валидация OAuth токена
3. Выбор папки (автоматически или из config)
4. Сохранение профиля в SQLite

#### 4. Composition Root Update

```typescript
// cloud-functions.composition.ts
export const core = defineCore({
  cloudFunctions: CloudFunctionFeature,
  identity: IdentityFeature,
  ycCli: YcCliFeature,  // Новый feature
});
```

## Использование

### Сценарий 1: Полная автоматическая инициализация

```bash
# Если yc CLI уже настроен с токеном
bun run init.ts
```

**Ожидаемый вывод:**
```
🔍 Initializing cloud environment...

📦 Step 1: Checking Yandex Cloud CLI...
✅ YC CLI is installed
✅ YC CLI is configured

🔑 Step 2: Validating OAuth token...
✅ Token is valid
   Subject: user-account-xyz

📁 Step 3: Getting folder information...
   Using folder: default (b1g...)

💾 Step 4: Saving cloud profile...
✅ Profile 'default' saved successfully.

============================================================
🎉 Cloud environment initialized successfully!
============================================================

Profile: default
Folder ID: b1g...
Cloud ID: b1h...
```

### Сценарий 2: Инициализация с явным токеном

```bash
YC_OAUTH_TOKEN=y0_AgAAAA... bun run init.ts
```

### Сценарий 3: Использование в demo скрипте

```typescript
// demo-deploy.ts автоматически вызывает init
const initResult = await initCloudCommand({
  oauthToken: OAUTH_TOKEN,
  folderId: FOLDER_ID,
  profileName: "demo-profile",
  auto: true,
});

if (!initResult.success) {
  console.log(`❌ Initialization failed: ${initResult.error}`);
  process.exit(1);
}
```

## Интеграция с Puppeteer (Future)

Для полностью бесшовной авторизации планируется интеграция с Puppeteer:

```typescript
// Автоматическое открытие браузера для логина
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://oauth.yandex.ru/authorize?response_type=token&client_id=...');

// Ожидание редиректа с токеном
await page.waitForFunction(() => 
  window.location.href.includes('access_token=')
);

const token = await page.evaluate(() => {
  const hash = window.location.hash.split('#')[1];
  return new URLSearchParams(hash).get('access_token');
});
```

**Преимущества:**
- ✅ Не нужно копировать токен вручную
- ✅ Пользователь видит стандартную страницу логина Яндекса
- ✅ Токен автоматически сохраняется в профиле

## Структура профилей

Профили хранятся в локальной SQLite БД (`cloud-profiles.sqlite`):

```sql
CREATE TABLE profiles (
  name TEXT PRIMARY KEY,
  folderId TEXT,
  oauthToken TEXT,
  serviceAccountKey TEXT,
  updated_at DATETIME
);
```

**Использование профилей:**

```bash
# Инициализация нового профиля
YC_OAUTH_TOKEN=xxx bun run init.ts --profile production

# Использование профиля в демо
bun run demo-deploy.ts --profile production
```

## Обработка ошибок

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `YC CLI is not installed` | yc CLI не установлен | `curl -sSL https://storage.yandexcloud.net/yandex-cloud-cli/latest/yc.sh \| bash` |
| `OAuth token not found` | Токен не найден в env или config | Использовать `YC_OAUTH_TOKEN=xxx` или `yc init` |
| `OAuth token is invalid` | Токен истек (24 часа) | Получить новый токен |
| `No folders found` | В облаке нет папок | `yc resource-manager folder create --name default` |

## HTTP API Endpoints

Init command использует следующие Yandex Cloud API:

```
POST https://iam.api.cloud.yandex.net/iam/v1/tokens
  Body: { yandexPassportOauthToken: "y0_..." }
  Response: { iamToken: "t1_...", expiresIn: 43200 }

GET https://resource-manager.api.cloud.yandex.net/resource-manager/v1/folders
  Headers: { Authorization: "Bearer t1_..." }
  Response: { folders: [{ id, name, cloudId, ... }] }

POST https://iam.api.cloud.yandex.net/iam/v3/tokens
  Headers: { Authorization: "Bearer t1_..." }
  Body: { iam_token: "t1_..." }
  Response: { subject: { userAccount: { subject: "..." } } }
```

## Расширение на другие облака

Архитектура позволяет легко добавить поддержку других провайдеров:

```typescript
// infrastructure/adapters/aws-cli.adapter.ts
export class AwsCliAdapter implements FeaturePorts<typeof CloudCliFeature> {
  checkCli() { /* aws --version */ }
  validateToken() { /* sts get-caller-identity */ }
  listFolders() { /* ec2 describe-vpcs */ }
}

// infrastructure/adapters/gcp-cli.adapter.ts
export class GcpCliAdapter implements FeaturePorts<typeof CloudCliFeature> {
  checkCli() { /* gcloud info */ }
  validateToken() { /* gcloud auth print-access-token */ }
  listFolders() { /* gcloud projects list */ }
}
```

## Тестирование

```bash
# Запустить тест OAuth авторизации
bun run test-oauth-login.ts

# Проверка инициализации
bun run init.ts

# Полный цикл деплоя
bun run demo-deploy.ts
```
