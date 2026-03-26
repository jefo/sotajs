# Supabase PostgreSQL — Настройка

## ✅ Готовые адаптеры

Созданы следующие PostgreSQL адаптеры:

| Адаптер | Файл |
|---------|------|
| Plans | `infrastructure/adapters/yandex-postgres-plan.adapter.ts` |
| Subscriptions | `infrastructure/adapters/yandex-postgres-subscription.adapter.ts` |
| Templates | `infrastructure/adapters/yandex-postgres-template.adapter.ts` |

**Примечание**: Адаптеры работают с любым PostgreSQL, включая Supabase.

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
bun add pg
```

### 2. Настройка `.env`

Файл уже настроен с вашими данными Supabase:

```bash
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://postgres.wfzarkephrmvcbomuuss:ycxAXHCa0dqs78VJ@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

### 3. Запуск

```bash
bun run index.ts
```

---

## 📁 Конфигурация

### Переменные окружения

| Переменная | Значение | Описание |
|------------|----------|----------|
| `DATABASE_TYPE` | `postgres` | Тип БД: `sqlite` или `postgres` |
| `DATABASE_URL` | (см. выше) | Connection string от Supabase |
| `BOT_TOKEN` | `your_token` | Токен Telegram бота |
| `ADMIN_ID` | `your_id` | ID администратора |
| `PAYMENT_PROVIDER` | `mock` | Платёжный провайдер |

### Файл `.env`

```bash
# Database type
DATABASE_TYPE=postgres

# Supabase Connection Pooler
DATABASE_URL=postgresql://postgres.wfzarkephrmvcbomuuss:ycxAXHCa0dqs78VJ@aws-1-eu-west-1.pooler.supabase.com:6543/postgres

# Bot settings
BOT_TOKEN=your_bot_token
ADMIN_ID=your_admin_id
PAYMENT_PROVIDER=mock
```

---

## 📊 Схема БД

Адаптеры автоматически создадут таблицы при первом запуске:

### Таблицы

```sql
-- plans: тарифные планы
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

-- subscriptions: подписки пользователей
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
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- access_grants: доступы к каналам
CREATE TABLE access_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  status TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- templates: шаблоны сообщений
CREATE TABLE templates (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### Индексы

Автоматически создаются для:
- `plans.name`, `plans.channel_id`
- `subscriptions.user_id`, `subscriptions.status`, `subscriptions.expires_at`
- `access_grants.user_id`, `access_grants.subscription_id`

---

## 🧪 Тестирование

```bash
# Запустить тест подключения
bun run test-supabase.ts
```

Ожидаемый результат:
```
✅ Supabase PostgreSQL connected successfully!
✅ Table created successfully!
✅ Test table dropped (cleanup complete)
```

---

## 🔧 Управление

### Просмотр данных в Supabase Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Table Editor** для просмотра данных

### SQL запросы

Используйте **SQL Editor** в Dashboard:

```sql
-- Все планы
SELECT * FROM plans;

-- Активные подписки
SELECT * FROM subscriptions WHERE status = 'active';

-- Доступы пользователя
SELECT * FROM access_grants WHERE user_id = '123456';

-- Удалить тестовые данные
DELETE FROM subscriptions WHERE user_id = 'test';
```

---

## 🔄 Переключение между SQLite и PostgreSQL

### На SQLite (локальная разработка)

```bash
# В .env
DATABASE_TYPE=sqlite

# Или запустить без DATABASE_TYPE
bun run index.ts
```

### На PostgreSQL (production)

```bash
# В .env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://...

# Запуск
DATABASE_TYPE=postgres bun run index.ts
```

---

## ⚠️ Важно

### Безопасность

- ⚠️ **Не коммитьте `.env` в git** — содержит пароли
- ✅ Добавьте в `.gitignore`:
  ```
  .env
  *.sqlite
  ```

### Connection Pooler

Используется **PgBouncer** (порт 6543) для:
- Эффективного управления подключениями
- Поддержки serverless (Cold Start)
- Защиты от превышения лимита подключений

### Лимиты (Supabase Free Tier)

| Ресурс | Лимит |
|--------|-------|
| Database size | 500 MB |
| Connections | 60 (через PgBouncer) |
| Egress | 5 GB/month |

---

## 🐛 Troubleshooting

### Ошибка: "DATABASE_URL is required"

**Решение**: Установите `DATABASE_URL` в `.env` или в переменной окружения.

### Ошибка: "relation does not exist"

**Причина**: Таблицы не созданы

**Решение**: Адаптеры создают схему автоматически. Проверьте логи на ошибки подключения.

### Ошибка: "too many clients"

**Решение**: 
1. Проверьте активные подключения в Dashboard
2. Уменьшите `max` в настройках пула (сейчас 10)

---

## 🔗 Ресурсы

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Connection Pooling Docs](https://supabase.com/docs/guides/database/database-connection-pooling)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
