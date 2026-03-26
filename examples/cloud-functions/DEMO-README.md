# Cloud Functions Demo

Демонстрация работы с облачными функциями через SotaJS CQRS паттерны.

## Что демонстрирует скрипт

1. **Deploy** - Деплой облачной функции в Yandex Cloud
2. **List** - Получение списка функций (проверка что функция появилась)
3. **Delete** - Удаление функции
4. **List** - Получение списка функций (проверка что функция удалена)

## Требования

- Node.js >= 18.0.0
- Bun (пакетный менеджер)
- Аккаунт в Yandex Cloud
- OAuth токен Yandex Cloud

## Получение OAuth токена

1. Откройте [Yandex Cloud OAuth](https://oauth.yandex.ru/client/new)
2. Создайте новый OAuth клиент
3. Получите токен через CLI:

```bash
# Установите yandex-cloud CLI
yc init

# Или получите токен вручную
curl -X POST \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<JWT>" \
  https://iam.api.cloud.yandex.net/iam/v1/tokens
```

## Запуск демо

```bash
# Установите переменные окружения и запустите скрипт
YC_OAUTH_TOKEN=y0_AgAAAA... YC_FOLDER_ID=b1g... bun run examples/cloud-functions/demo-deploy.ts
```

## Ожидаемый вывод

```
🚀 SotaJS Cloud Functions: Deployment Demo

============================================================

📦 Step 0: Saving cloud profile to local database...
✅ Profile 'demo-profile' saved successfully.

☁️  Step 1: Deploying cloud function...
   Name: sotajs-demo-123456
   Runtime: nodejs18
   Memory: 128 MB
   Public Access: enabled

✅ Deployment successful in 15.2s
   Function ID: d4e...xyz
   Version: d4v...abc
   Public URL: https://...

📋 Step 2: Listing all functions in folder...
   Total functions: 1

   Functions:
   ✅ FOUND: sotajs-demo-123456 (d4e...xyz)
      Status: active
      Runtime: nodejs18
      URL: https://...

🗑️  Step 3: Deleting the function...
   Function ID: d4e...xyz

✅ Function deleted successfully in 5.3s

📋 Step 4: Listing all functions again (verification)...
   Total functions: 0

   ✅ VERIFIED: Function d4e...xyz is gone

============================================================
🎉 DEMO COMPLETED SUCCESSFULLY!
============================================================

Summary:
  ✅ Deployed: sotajs-demo-123456
  ✅ Verified: Function appeared in list
  ✅ Deleted: Function removed
  ✅ Verified: Function no longer in list

All operations completed successfully! 🚀
```

## Архитектура

Скрипт использует CQRS паттерны SotaJS:

- **Commands** (изменение состояния):
  - `saveProfileCommand` - сохранение облачного профиля
  - `deployFunctionCommand` - деплой функции
  - `deleteFunctionCommand` - удаление функции

- **Queries** (чтение данных):
  - `listFunctionsQuery` - получение списка функций

Все операции выполняются через **Ports & Adapters**:
- Бизнес-логика не зависит от конкретного облака
- Yandex Cloud реализован как адаптер
- Можно легко добавить другой облачный провайдер

## Структура проекта

```
examples/cloud-functions/
├── demo-deploy.ts                  # Демонстрационный скрипт
├── cloud-functions.composition.ts  # Composition Root
├── application/
│   ├── commands/                   # CQRS Commands
│   │   ├── deploy-function.command.ts
│   │   ├── delete-function.command.ts
│   │   └── save-profile.command.ts
│   ├── queries/                    # CQRS Queries
│   │   └── list-functions.query.ts
│   └── ports/                      # Ports (абстракции)
├── domain/                         # Domain Models (Aggregates)
└── infrastructure/
    ├── adapters/                   # Адаптеры (Yandex Cloud)
    └── ports/                      # Infrastructure Ports
```

## Очистка ресурсов

Скрипт автоматически удаляет созданную функцию. Если что-то пошло не так, 
функции можно удалить через Yandex Cloud Console:

```bash
yc serverless function list  # Показать все функции
yc serverless function delete --name <function-name>  # Удалить функцию
```

## Следующие шаги

1. Добавить поддержку других облачных провайдеров (AWS Lambda, Google Cloud Functions)
2. Добавить invoke функцию для тестирования deployed функций
3. Добавить версионирование и откат версий
4. Интеграция с CI/CD
