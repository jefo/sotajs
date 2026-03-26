# SotaJS: Configuration-Driven Deployment

## 📋 Overview

Деплой функций в Yandex Cloud через конфигурационный файл `sota.yml` (как в Serverless Framework).

## 🚀 Quick Start

### 1. Создайте sota.yml

```yaml
service: my-service

provider:
  name: yandex
  runtime: nodejs18
  memorySize: 256
  timeout: 10s
  folderId: b1g...
  oauthToken: ${env:YC_OAUTH_TOKEN}

functions:
  bot:
    handler: dist/bot.js
    name: tg-paywall-bot
    entrypoint: index.handler
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
      ADMIN_ID: ${env:ADMIN_ID}

  payments:
    handler: dist/payment.js
    name: tg-paywall-payments
    entrypoint: index.handler
    environment:
      PAYMENT_SIGNING_SECRET: ${env:PAYMENT_SIGNING_SECRET}
```

### 2. Соберите функции

```bash
bun build src/handler.ts --target node --minify --outfile dist/bot.js
bun build src/payment-handler.ts --target node --minify --outfile dist/payment.js
```

### 3. Задеплойте

```bash
bun run examples/cloud-functions/sota-deploy.ts
```

## 📖 Configuration Reference

### Root

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `service` | string | ✅ | Имя сервиса |
| `provider` | object | ✅ | Конфигурация провайдера |
| `functions` | object | ✅ | Функции для деплоя |

### Provider

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `name` | string | ✅ | - | Имя провайдера (yandex) |
| `runtime` | string | ✅ | - | Runtime (nodejs18, nodejs20, etc.) |
| `memorySize` | number | ✅ | - | Память в MB (128-4096) |
| `timeout` | string\|number | ✅ | 10s | Таймаут (например: `10s` или `10`) |
| `folderId` | string | ✅ | - | Yandex Cloud Folder ID |
| `oauthToken` | string | ✅ | - | OAuth токен (или через env) |

### Functions

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `handler` | string | ✅ | - | Путь к JS файлу (относительно sota.yml) |
| `name` | string | ✅ | - | Имя функции в облаке |
| `entrypoint` | string | ❌ | index.handler | Точка входа |
| `memory` | number | ❌ | provider.memorySize | Память для функции |
| `timeout` | string\|number | ❌ | provider.timeout | Таймаут для функции |
| `runtime` | string | ❌ | provider.runtime | Runtime для функции |
| `environment` | object | ❌ | - | Переменные окружения |

## 🔧 Environment Variables

Используйте `${env:VAR_NAME}` для подстановки переменных окружения:

```yaml
provider:
  oauthToken: ${env:YC_OAUTH_TOKEN}
  folderId: ${env:YC_FOLDER_ID}

functions:
  bot:
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
```

## 📦 Commands

### Deploy all functions

```bash
bun run examples/cloud-functions/sota-deploy.ts
```

### Deploy specific function

```bash
bun run examples/cloud-functions/sota-deploy.ts --function=bot
```

### Use custom config file

```bash
bun run examples/cloud-functions/sota-deploy.ts --config=./prod.yml
```

## 📝 Examples

### Example 1: Simple Bot

```yaml
service: echo-bot

provider:
  name: yandex
  runtime: nodejs18
  memorySize: 128
  timeout: 5s
  folderId: ${env:YC_FOLDER_ID}
  oauthToken: ${env:YC_OAUTH_TOKEN}

functions:
  echo:
    handler: dist/echo.js
    name: echo-bot
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
```

### Example 2: Multiple Environments

**dev.yml:**
```yaml
service: myapp-dev

provider:
  name: yandex
  runtime: nodejs18
  memorySize: 128
  timeout: 5s
  folderId: ${env:YC_FOLDER_ID}
  oauthToken: ${env:YC_OAUTH_TOKEN}

functions:
  bot:
    handler: dist/bot.js
    name: myapp-bot-dev
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
      DEBUG: "true"
```

**prod.yml:**
```yaml
service: myapp-prod

provider:
  name: yandex
  runtime: nodejs18
  memorySize: 256
  timeout: 10s
  folderId: ${env:YC_FOLDER_ID}
  oauthToken: ${env:YC_OAUTH_TOKEN}

functions:
  bot:
    handler: dist/bot.js
    name: myapp-bot-prod
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
```

Deploy:
```bash
# Deploy to dev
bun run sota-deploy.ts --config=./dev.yml

# Deploy to prod
bun run sota-deploy.ts --config=./prod.yml
```

### Example 3: TG Paywall (Full)

```yaml
service: tg-paywall

provider:
  name: yandex
  runtime: nodejs18
  memorySize: 256
  timeout: 10s
  folderId: ${env:YC_FOLDER_ID}
  oauthToken: ${env:YC_OAUTH_TOKEN}

functions:
  bot:
    handler: dist/bot.js
    name: tg-paywall-bot
    entrypoint: index.handler
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
      ADMIN_ID: ${env:ADMIN_ID}

  payments:
    handler: dist/payment.js
    name: tg-paywall-payments
    entrypoint: index.handler
    environment:
      PAYMENT_SIGNING_SECRET: ${env:PAYMENT_SIGNING_SECRET}
```

## 🎯 Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. sota.yml                                            │
│  2. bun build src/*.ts --target node --outfile dist/*.js│
│  3. bun run sota-deploy.ts                              │
│  4. ✅ Functions deployed!                              │
└─────────────────────────────────────────────────────────┘
```

## ⚠️ Notes

- **Build yourself**: `sota deploy` не билдит код, только деплоит
- **Handler paths**: Относительные пути от файла `sota.yml`
- **Environment**: Все переменные окружения должны быть установлены перед деплоем
- **Public by default**: Все функции публичные (для webhook'ов)

## 🛠️ Troubleshooting

### "Configuration file not found"

Убедитесь что `sota.yml` в текущей директории или укажите путь:
```bash
bun run sota-deploy.ts --config=./path/to/sota.yml
```

### "Handler file not found"

Проверьте что файлы собраны:
```bash
ls -la dist/
```

### "OAuth token is invalid"

Обновите токен:
```
https://oauth.yandex.ru/authorize?response_type=token&client_id=1a699f511260fe6582d1
```
