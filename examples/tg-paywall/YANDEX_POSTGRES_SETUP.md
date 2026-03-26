# Yandex Cloud PostgreSQL Setup

## Обзор

Этот проект поддерживает работу с **Yandex Managed PostgreSQL** для деплоя в Yandex Cloud. PostgreSQL адаптер полностью заменяет SQLite в production-среде.

## Преимущества PostgreSQL для Serverless

| Характеристика | SQLite | Yandex Managed PostgreSQL |
|----------------|--------|---------------------------|
| **Serverless-совместимость** | ❌ Файл в `/tmp` теряется | ✅ Полностью управляемая |
| **Конкурентный доступ** | ❌ Ограниченный | ✅ Множество подключений |
| **Холодный старт** | ⚠️ Медленная инициализация | ✅ Быстрое подключение из пула |
| **Надёжность** | ❌ Нет репликации | ✅ Автоматические бэкапы, HA |
| **Масштабирование** | ❌ Ограничено | ✅ Автоматическое |

---

## Шаг 1: Создание БД в Yandex Cloud

### 1.1 Создайте кластер PostgreSQL

```bash
# Через Yandex Cloud CLI
yc managed-postgresql cluster create \
  --name tg-paywall-db \
  --environment production \
  --network-id <your-network-id> \
  --preset s2.micro \
  --storage-size 10GB \
  --zone ru-central1-a \
  --host name=node1,zone=ru-central1-a
```

### 1.2 Создайте базу данных и пользователя

```bash
# База данных
yc managed-postgresql db create \
  --cluster-name tg-paywall-db \
  --name paywall_db

# Пользователь
yc managed-postgresql user create \
  --cluster-name tg-paywall-db \
  --name paywall_user \
  --password <secure_password> \
  --grant paywall_db
```

### 1.3 Получите connection string

```bash
# Получить строку подключения
yc managed-postgresql cluster get-connection-string \
  --cluster-name tg-paywall-db
```

Пример connection string:
```
postgresql://paywall_user:password@epg6....rw.mdb.yandexcloud.net:6432/paywall_db?sslmode=require
```

---

## Шаг 2: Настройка переменных окружения

### Для локальной разработки

Создайте `.env` файл:

```bash
# Переключение на PostgreSQL
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://paywall_user:password@host:port/paywall_db?sslmode=require

# Остальные переменные
BOT_TOKEN=your_bot_token
ADMIN_ID=your_chat_id
PAYMENT_PROVIDER=yookassa
```

### Для Cloud Function

При деплое функции установите переменные:

```bash
yc serverless function version create \
  --function-name tg-paywall \
  --runtime nodejs18 \
  --entrypoint handler.main \
  --memory 256m \
  --execution-timeout 30s \
  --source-path function.zip \
  --environment DATABASE_TYPE=postgres,DATABASE_URL=postgresql://...,BOT_TOKEN=xxx,ADMIN_ID=xxx
```

### Для Serverless Container

```yaml
# docker-compose.yml или deployment config
environment:
  - DATABASE_TYPE=postgres
  - DATABASE_URL=${DATABASE_URL}
  - BOT_TOKEN=${BOT_TOKEN}
  - ADMIN_ID=${ADMIN_ID}
```

---

## Шаг 3: Установка зависимостей

Для работы с PostgreSQL требуется пакет `pg`:

```bash
bun add pg
# или
npm install pg
# или
yarn add pg
```

**Важно**: Типы TypeScript уже включены в пакет `pg`.

---

## Шаг 4: Миграция данных (опционально)

Если у вас есть данные в SQLite и нужно перенести их в PostgreSQL:

### 4.1 Экспорт из SQLite

```bash
# Установите sqlite3 CLI
sqlite3 paywall.sqlite ".dump" > backup.sql
```

### 4.2 Конвертация в PostgreSQL формат

Создайте скрипт миграции или используйте инструменты вроде [pgloader](https://pgloader.io/):

```bash
pgloader sqlite://./paywall.sqlite postgresql://user:pass@host/db
```

---

## Архитектура адаптеров

### Схема инициализации

```
paywall.composition.ts
├── Определяет DATABASE_TYPE (sqlite/postgres)
├── Если postgres:
│   ├── YandexPostgresPlanAdapter
│   ├── YandexPostgresSubscriptionAdapter
│   └── YandexPostgresTemplateAdapter
└── Если sqlite:
    ├── SqlitePlanAdapter
    ├── SqliteSubscriptionAdapter
    └── SqliteTemplateAdapter
```

### Особенности реализации

1. **Connection Pool**: Используется `pg.Pool` с ограничением в 10 соединений
2. **Serverless-оптимизация**: 
   - `connectionTimeoutMillis: 5000` — быстрый фейл при холодном старте
   - `statement_timeout: 10000` — защита от долгих запросов
3. **Индексы**: Автоматически создаются для часто используемых полей
4. **Foreign Keys**: Каскадное удаление связанных записей

---

## Схема базы данных

### Таблица `plans`

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan_group TEXT NOT NULL DEFAULT 'standard',
  access_level TEXT NOT NULL DEFAULT 'base',
  price INTEGER NOT NULL,
  currency TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  trial_days INTEGER NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  channel_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### Таблица `subscriptions`

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_plan
    FOREIGN KEY (plan_id)
    REFERENCES plans(id)
    ON DELETE CASCADE
);
```

### Таблица `access_grants`

```sql
CREATE TABLE access_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  status TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_subscription
    FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(id)
    ON DELETE CASCADE
);
```

### Таблица `templates`

```sql
CREATE TABLE templates (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

---

## Мониторинг и обслуживание

### Проверка подключения

```typescript
// В handler.ts или index.ts
try {
  await pool.query('SELECT 1');
  console.log('PostgreSQL connected');
} catch (error) {
  console.error('Database connection failed:', error);
}
```

### Логи в Yandex Cloud

```bash
# Просмотр логов функции
yc serverless function logs --name tg-paywall --follow

# Логи PostgreSQL (через Cloud Logging)
yc logging read --folder-id <folder-id> --filter "resource.type=managed-postgresql"
```

### Бэкапы

Yandex Managed PostgreSQL автоматически создаёт бэкапы. Для ручного бэкапа:

```bash
yc managed-postgresql backup create --cluster-name tg-paywall-db
```

---

## Troubleshooting

### Ошибка: "DATABASE_URL is required"

**Решение**: Установите переменную окружения:
```bash
export DATABASE_URL=postgresql://user:pass@host/db
```

### Ошибка: "Connection timeout"

**Причины**:
- Неправильный connection string
- Брандмауэр не разрешает доступ
- Лимит подключений исчерпан

**Решение**:
1. Проверьте connection string в консоли Yandex Cloud
2. Добавьте IP-адрес функции в allowed IPs кластера
3. Увеличьте `max_connections` в настройках кластера

### Ошибка: "relation does not exist"

**Причина**: Таблицы не созданы

**Решение**: Адаптеры автоматически создают схему при первом подключении. Проверьте логи на наличие ошибок инициализации.

### Холодный старт > 3 секунд

**Решение**:
1. Используйте **Serverless Container** вместо Cloud Function
2. Настройте **provisioned instances** для функции
3. Уменьшите `connectionTimeoutMillis` в пуле соединений

---

## Стоимость (на 2024)

| Ресурс | Тариф | Примерная стоимость/месяц |
|--------|-------|---------------------------|
| **pg-0 (free tier)** | 0.25 CPU, 0.5 GB RAM | Бесплатно (до 100 часов) |
| **pg-s2.micro** | 2 CPU, 2 GB RAM | ~3000 RUB |
| **pg-s2.small** | 2 CPU, 4 GB RAM | ~6000 RUB |
| **Storage** | 10 GB | ~150 RUB |
| **Бэкапы** | 10 GB | ~75 RUB |

**Итого**: от ~3200 RUB/месяц за production-кластер.

---

## Следующие шаги

1. ✅ Создать кластер PostgreSQL в Yandex Cloud
2. ✅ Настроить `DATABASE_URL` в переменных окружения
3. ✅ Установить `bun add pg`
4. ✅ Протестировать локально: `DATABASE_TYPE=postgres bun run index.ts`
5. ✅ Задеплоить функцию с PostgreSQL

## Дополнительные ресурсы

- [Yandex Managed PostgreSQL Docs](https://yandex.cloud/docs/managed-postgresql/)
- [pg package (npm)](https://www.npmjs.com/package/pg)
- [Serverless Container](https://yandex.cloud/docs/serverless-containers/)
