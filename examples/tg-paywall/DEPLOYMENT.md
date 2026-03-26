# TG Paywall: Production Deployment Guide

## 📋 Prerequisites

### 1. Yandex Cloud Credentials

Получите OAuth токен:
```
https://oauth.yandex.ru/authorize?response_type=token&client_id=1a699f511260fe6582d1
```

Сохраните:
- `YC_OAUTH_TOKEN` - OAuth токен
- `YC_FOLDER_ID` - ID папки в Yandex Cloud

### 2. Telegram Bot Token

Создайте бота в [@BotFather](https://t.me/BotFather):
```
/newbot
```

Сохраните:
- `BOT_TOKEN` - Токен бота
- `ADMIN_ID` - Ваш Telegram user ID (число)

### 3. Payment Provider (опционально)

Для демонстрационной платежки:
- `PAYMENT_SIGNING_SECRET` - Секрет для подписи webhook'ов

## 🚀 Deployment (Configuration-Driven)

### Step 1: Configuration

Файл `sota.yml` уже создан в корне проекта:

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
    environment:
      BOT_TOKEN: ${env:BOT_TOKEN}
      ADMIN_ID: ${env:ADMIN_ID}

  payments:
    handler: dist/payment.js
    name: tg-paywall-payments
    environment:
      PAYMENT_SIGNING_SECRET: ${env:PAYMENT_SIGNING_SECRET}
```

### Step 2: Build

```bash
cd examples/tg-paywall

# Build bot handler
bun build handler.ts --target node --minify --outfile dist/bot.js

# Build payment handler
bun build payment-handler.ts --target node --minify --outfile dist/payment.js
```

### Step 3: Deploy

```bash
# Set environment variables
export BOT_TOKEN=123456:ABC-DEF1234
export ADMIN_ID=789012
export YC_OAUTH_TOKEN=y0_AgA...
export YC_FOLDER_ID=b1g...
export PAYMENT_SIGNING_SECRET=my_secret

# Deploy all functions
bun run ../cloud-functions/sota-deploy.ts
```

### Output

```
🚀 SotaJS Deploy

==================================================
📄 Config: sota.yml
📦 Service: tg-paywall
☁️  Provider: yandex

──────────────────────────────────────────────────
📦 Deploying: bot
   Name: tg-paywall-bot
   Handler: dist/bot.js
   Runtime: nodejs18
   Memory: 256 MB
   Timeout: 10s
   Environment:
     BOT_TOKEN: 123456:...
     ADMIN_ID: 789012
✅ bot deployed successfully
   Function ID: d4e...
   Version: d4e...

──────────────────────────────────────────────────
📦 Deploying: payments
✅ payments deployed successfully
   Function ID: d4e...

==================================================
🎉 All 2 function(s) deployed successfully!
```

## 🔗 Webhook Setup

### Telegram Webhook

После деплоя настройте Telegram webhook:

```bash
# Get function URL from deployment output or Yandex Cloud Console
FUNCTION_URL=https://d4e...functions.yandexcloud.net

# Set webhook
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$FUNCTION_URL"
```

### Payment Webhook

Настройте webhook в личном кабинете платежной системы:

```
URL: <PAYMENT_FUNCTION_URL>
```

Где `PAYMENT_FUNCTION_URL` - URL функции `tg-paywall-payments` из Yandex Cloud Console.

## 📦 Deployed Functions

| Функция | Назначение | Webhook |
|---------|-----------|---------|
| `tg-paywall-bot` | Обработка сообщений Telegram | Автоматически (curl) |
| `tg-paywall-payments` | Обработка платежей | Вручную (в кабинете) |

| Функция | Назначение | Webhook |
|---------|-----------|---------|
| `tg-paywall-bot` | Обработка сообщений Telegram | Автоматически |
| `tg-paywall-payments` | Обработка платежей | Вручную |

## 🔗 Webhook Configuration

### Telegram Webhook
Настраивается **автоматически** при деплое.

URL: `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<BOT_FUNCTION_URL>`

### Payment Webhook
Настраивается **вручную** в личном кабинете платежной системы.

URL для настройки: `<PAYMENT_FUNCTION_URL>`

#### Примеры для разных провайдеров:

**YooKassa:**
```
https://yookassa.ru/my/merchant/integration/webhook
→ <PAYMENT_FUNCTION_URL>
```

**Stripe:**
```
https://dashboard.stripe.com/settings/webhooks
→ <PAYMENT_FUNCTION_URL>
```

**Robokassa:**
```
https://merchant.roboxchange.com/Interface/ServiceConfig/
→ <PAYMENT_FUNCTION_URL>
```

## 🧪 Testing

### 1. Test Bot
```
1. Откройте бота в Telegram
2. Нажмите /start
3. Проверьте ответ
```

### 2. Test Payment (Demo)
```bash
# Отправьте POST запрос на payment function
curl -X POST <PAYMENT_FUNCTION_URL> \
  -H "Content-Type: application/json" \
  -H "X-Signature: $(echo -n '<subscription_id>:demo_secret_123' | base64)" \
  -d '{"subscriptionId": "<subscription_id>"}'
```

### 3. Check Logs
```bash
# Yandex Cloud Functions logs
yc serverless function version logs --name <function-name>
```

## 🔧 Troubleshooting

### Bot не отвечает
1. Проверьте webhook:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
   ```
2. Проверьте логи функции в Yandex Cloud Console

### Payment не проходит
1. Проверьте signature в заголовке `X-Signature`
2. Убедитесь, что формат payload соответствует ожидаемому
3. Проверьте логи payment функции

### Deployment failed
1. Проверьте валидность OAuth токена
2. Убедитесь, что у токена есть права на Cloud Functions
3. Проверьте квоты Yandex Cloud

## 📊 Monitoring

- **Yandex Cloud Console** → Serverless → Cloud Functions
- **Telegram Bot API** → `getWebhookInfo`
- **Payment Provider Dashboard** → Webhook logs

## 🛑 Cleanup

Удаление функций:
```bash
yc serverless function delete --name tg-paywall-bot
yc serverless function delete --name tg-paywall-payments
```

Сброс Telegram webhook:
```
https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook
```
