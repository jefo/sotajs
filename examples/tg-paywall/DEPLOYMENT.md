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
- `PAYMENT_SIGNING_SECRET` - Секрет для подписи webhook'ов (по умолчанию: `demo_secret_123`)

## 🚀 Deployment Options

### Option 1: Simple Deploy (sota-deploy)

**Quick deployment using built-in CLI:**

```bash
# 1. Build bot
bun build examples/tg-paywall/handler.ts --target node --minify --outfile dist/bot.js

# 2. Deploy bot
bun run examples/cloud-functions/sota-deploy.ts dist/bot.js \
  --name=tg-paywall-bot \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=BOT_TOKEN=$BOT_TOKEN \
  --env=ADMIN_ID=$ADMIN_ID \
  --memory=256

# 3. Build payment handler
bun build examples/tg-paywall/payment-handler.ts --target node --minify --outfile dist/payment.js

# 4. Deploy payment handler
bun run examples/cloud-functions/sota-deploy.ts dist/payment.js \
  --name=tg-paywall-payments \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=PAYMENT_SIGNING_SECRET=$PAYMENT_SECRET
```

### Option 2: Full Deploy Script

**Automated deployment with webhook setup:**

```bash
BOT_TOKEN=xxx YC_OAUTH_TOKEN=yyy YC_FOLDER_ID=zzz ADMIN_ID=123 bun run examples/tg-paywall/scripts/deploy.ts
```

Этот скрипт:
- Инициализирует облачное окружение (Step 0)
- Деплоит обе функции
- Автоматически настраивает Telegram webhook

## 📦 Deployed Functions

После деплоя вы получите:

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
