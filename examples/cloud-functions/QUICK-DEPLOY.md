# Sota Deploy: Quick Reference

## 🎯 Command

```bash
bun run examples/cloud-functions/sota-deploy.ts <path-to-built-file.js> [options]
```

## 📋 Required Parameters

```bash
--name=<function-name>     # Имя функции в Yandex Cloud
--folder=<folder-id>       # Yandex Cloud Folder ID
--token=<oauth-token>      # Yandex OAuth Token
```

Или через env:
```bash
export YC_FOLDER_ID=b1g...
export YC_OAUTH_TOKEN=y0_...
```

## 🔧 Options

```bash
--runtime=nodejs18         # Runtime (default: nodejs18)
--memory=128               # Memory in MB (default: 128)
--timeout=10               # Timeout in seconds (default: 10)
--env=KEY=value            # Environment variable (can repeat)
--public=true              # Make public (default: true)
```

## 📦 Example: Deploy Telegram Bot

### Step 1: Build
```bash
bun build examples/tg-paywall/handler.ts --target node --minify --outfile dist/bot.js
```

### Step 2: Deploy
```bash
bun run examples/cloud-functions/sota-deploy.ts dist/bot.js \
  --name=tg-paywall-bot \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=BOT_TOKEN=$BOT_TOKEN \
  --env=ADMIN_ID=$ADMIN_ID \
  --memory=256
```

### Step 3: Setup Telegram Webhook
```bash
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=<FUNCTION_URL>"
```

## 📦 Example: Deploy Payment Handler

### Step 1: Build
```bash
bun build examples/tg-paywall/payment-handler.ts --target node --minify --outfile dist/payment.js
```

### Step 2: Deploy
```bash
bun run examples/cloud-functions/sota-deploy.ts dist/payment.js \
  --name=tg-paywall-payments \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=PAYMENT_SIGNING_SECRET=my_secret
```

### Step 3: Configure Payment Provider
Настройте webhook в личном кабинете платежной системы:
```
<FUNCTION_URL>
```

## 🎬 Full Flow (Both Functions)

```bash
#!/bin/bash

# 1. Build both functions
echo "🔨 Building bot..."
bun build examples/tg-paywall/handler.ts --target node --minify --outfile dist/bot.js

echo "🔨 Building payment handler..."
bun build examples/tg-paywall/payment-handler.ts --target node --minify --outfile dist/payment.js

# 2. Deploy bot
echo "🚀 Deploying bot..."
bun run examples/cloud-functions/sota-deploy.ts dist/bot.js \
  --name=tg-paywall-bot \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=BOT_TOKEN=$BOT_TOKEN \
  --env=ADMIN_ID=$ADMIN_ID \
  --memory=256

# 3. Deploy payment handler
echo "🚀 Deploying payment handler..."
bun run examples/cloud-functions/sota-deploy.ts dist/payment.js \
  --name=tg-paywall-payments \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=PAYMENT_SIGNING_SECRET=$PAYMENT_SECRET

echo "✅ Deployment complete!"
```

## ⚠️ Notes

- **Build yourself**: `sota deploy` не билдит, только деплоит готовые файлы
- **Single file**: Все зависимости должны быть в бандле
- **Entrypoint**: Всегда `index.handler`
- **Public by default**: Функции публичные для webhook'ов
