# SotaJS Deploy CLI

Простой инструмент для деплоя JavaScript функций в Yandex Cloud Functions.

## 🚀 Quick Start

### 1. Соберите функцию

```bash
bun build src/my-bot.ts --target node --outfile dist/my-bot.js
```

### 2. Задеплойте

```bash
bun run examples/cloud-functions/sota-deploy.ts dist/my-bot.js \
  --name=my-bot \
  --folder=b1g... \
  --token=y0_AgA...
```

## 📖 Usage

```bash
bun run sota-deploy.ts <function.js> [options]
```

### Required Arguments

| Аргумент | Описание |
|----------|----------|
| `<function.js>` | Путь к собранному JS файлу |
| `--name` | Имя функции в Yandex Cloud |
| `--folder` | Yandex Cloud Folder ID (или `YC_FOLDER_ID` env) |
| `--token` | Yandex OAuth Token (или `YC_OAUTH_TOKEN` env) |

### Options

| Опция | По умолчанию | Описание |
|-------|--------------|----------|
| `--runtime` | `nodejs18` | Runtime версия |
| `--memory` | `128` | Лимит памяти в MB |
| `--timeout` | `10` | Таймаут выполнения в секундах |
| `--env` | - | Переменные окружения (format: `KEY=value`) |
| `--public` | `true` | Сделать функцию публичной |

## 📋 Examples

### Basic Deploy

```bash
bun run sota-deploy.ts dist/bot.js \
  --name=telegram-bot \
  --folder=b1gg3n3v1rr41aqh30o9 \
  --token=y0_AgAAAA...
```

### With Environment Variables

```bash
bun run sota-deploy.ts dist/bot.js \
  --name=telegram-bot \
  --folder=b1gg3n3v1rr41aqh30o9 \
  --token=y0_AgAAAA... \
  --env=BOT_TOKEN=123456:ABC-DEF1234 \
  --env=ADMIN_ID=789012
```

### Custom Configuration

```bash
bun run sota-deploy.ts dist/bot.js \
  --name=telegram-bot \
  --folder=b1gg3n3v1rr41aqh30o9 \
  --token=y0_AgAAAA... \
  --runtime=nodejs18 \
  --memory=256 \
  --timeout=30 \
  --env=BOT_TOKEN=xxx
```

### Using Environment Variables

```bash
export YC_OAUTH_TOKEN=y0_AgAAAA...
export YC_FOLDER_ID=b1gg3n3v1rr41aqh30o9

bun run sota-deploy.ts dist/bot.js \
  --name=telegram-bot \
  --env=BOT_TOKEN=xxx
```

## 🔧 Build Instructions

### Для Telegram Bot (grammY)

```bash
# 1. Соберите бота
bun build src/bot.ts --target node --minify --outfile dist/bot.js

# 2. Задеплойте
bun run sota-deploy.ts dist/bot.js \
  --name=telegram-bot \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=BOT_TOKEN=$BOT_TOKEN
```

### Для Payment Handler

```bash
# 1. Соберите payment handler
bun build src/payment-handler.ts --target node --minify --outfile dist/payment.js

# 2. Задеплойте
bun run sota-deploy.ts dist/payment.js \
  --name=payment-handler \
  --folder=$YC_FOLDER_ID \
  --token=$YC_OAUTH_TOKEN \
  --env=PAYMENT_SIGNING_SECRET=your_secret
```

## 📤 Output

После успешного деплоя вы получите:

```
✅ Deployment successful!
   Duration: 5.2s
   Function ID: d4e1otqgasdmrh275eic
   Version: d4eb9ge51j1hnfanvlp5
   Public URL: https://d4e1otqgasdmrh275eic.functions.yandexcloud.net
```

## 🔗 Next Steps

### Setup Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<FUNCTION_URL>"
```

### Setup Payment Webhook

Настройте webhook в личном кабинете платежной системы:
```
<FUNCTION_URL>
```

## 🛠️ Troubleshooting

### "Cannot read function file"

Убедитесь что файл существует и путь правильный:
```bash
ls -la dist/my-function.js
```

### "OAuth token is invalid"

Проверьте токен:
```
https://oauth.yandex.ru/authorize?response_type=token&client_id=1a699f511260fe6582d1
```

### "Folder not found"

Проверьте Folder ID в Yandex Cloud Console:
```
https://console.cloud.yandex.ru/folders
```

## 📝 Notes

- **Билд на вашей стороне**: `sota deploy` не билдит код, только деплоит
- **Один файл**: Деплоит один JS файл (все зависимости должны быть в бандле)
- **Entrypoint**: Всегда использует `index.handler` как точку входа
- **Публичный доступ**: По умолчанию функции публичные (для webhook'ов)

## 🎯 Philosophy

> `sota deploy` делает только одну вещь: деплоит готовый JS файл в облако.
> 
> Всё остальное (билд, настройка webhook'ов, управление профилями) остаётся за пользователем.
