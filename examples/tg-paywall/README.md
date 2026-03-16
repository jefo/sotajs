# 🚀 Telegram Paywall Service: The Professional Way to Monetize Communities

**Infrastructure for expert-led recurring revenue, built with SotaJS & Hexagonal Architecture.**

Этот проект — не просто пример бота. Это готовый архитектурный шаблон (Blueprints) для создания масштабируемых сервисов подписки в Telegram. Он создан для разработчиков, которые ценят чистоту кода, предсказуемость бизнес-логики и хотят предоставлять своим клиентам (экспертам и блогерам) решение уровня Enterprise.

---

## 💎 Почему это соблазнительно для разработчика?

### 1. "Write Once, Run Everywhere" (SotaJS Power)
Ваша бизнес-логика (Use Cases) полностью изолирована. Сегодня это Telegram-бот на **grammY**, завтра — веб-интерфейс или Discord-бот. Вы меняете адаптеры, но не трогаете ядро.

### 2. Богатая доменная модель (Rich Domain Model)
Забудьте об "анемичных" базах данных. Агрегаты `Plan`, `Subscription` и `AccessGrant` сами следят за своими инвариантами. Нельзя активировать просроченную подписку. Нельзя выдать доступ без оплаты. Логика защищена на уровне кода, а не только тестами.

### 3. CQRS — Чистое разделение
Мы четко разделяем **Команды** (изменение состояния: `confirmPayment`) и **Запросы** (чтение: `listActiveSubscriptions`). Это делает систему невероятно легкой в отладке и масштабировании.

### 4. VIP-Брендинг для ваших клиентов
В отличие от дешевых конструкторов, эта архитектура позволяет каждому вашему клиенту иметь **собственного брендированного бота**, сохраняя при этом централизованное управление.

---

## 📢 Манифест дистрибуции: "Золотая Середина" (SaaS с кастомными токенами)

Мы официально выбираем модель **Variant C: SaaS with Custom Tokens**. Это стратегическое решение, которое дает лучшее из двух миров:

1.  **Централизованное Ядро**: Вся мощная бизнес-логика SotaJS крутится на одном сервере. Вам не нужно обновлять 100 разных инстансов кода.
2.  **Индивидуальность (Whitelabel)**: Каждый эксперт подключает свой `BOT_TOKEN`. Пользователи видят бота именно этого эксперта (напр. `@IvanVIP_Bot`), а не безликий сервис.
3.  **Единый Access Control**: Один воркер следит за всеми подписками во всех каналах, используя единые порты и адаптеры.

**Это идеальная модель для продажи**: Вы продаете эксперту не "код", а "сервис", где он остается владельцем своего бренда в Telegram.

---

## 📁 Структура проекта

```
examples/tg-paywall/
├── domain/                   # Rich Domain Models (Aggregates, Invariants)
│   ├── plan.aggregate.ts     # Тарифные планы (мультиканальность)
│   ├── subscription.ts       # Жизненный цикл оплаты
│   └── access-grant.ts       # Access Control as a Domain Model
│
├── application/              # Pure Business Logic (CQRS)
│   ├── commands/             # Запись (createPlan, confirmPayment, revoke)
│   └── queries/              # Чтение (listPlans, findUserSubscription)
│
├── infrastructure/           # Ports & Adapters (The "Outer" Layer)
│   ├── ports/                # Контракты (DB, Payment, Telegram API)
│   └── adapters/
│       ├── in-memory.ts      # Быстрый старт и тесты
│       ├── grammy-bot.ts     # Реальный Driving Adapter на grammY
│       └── telegram-bot.ts   # Виртуальная симуляция для демо
│
├── paywall.composition.ts    # Composition Root (Dependency Injection)
├── paywall.test.ts           # 100% покрытие бизнес-правил
└── index.ts                  # Точка входа (Real Bot vs Simulation)
```

---

## 🚀 Быстрый старт для профи

### 1. Запуск реального бота
Хотите проверить в деле? Создайте закрытый канал, добавьте туда бота админом с правами на управление ссылками и блокировку пользователей, затем запустите:
```bash
BOT_TOKEN=your_token ADMIN_ID=your_id bun run examples/tg-paywall/index.ts
```

### 2. Запуск симуляции (без токена)
Просто посмотрите, как работает архитектура в консоли:
```bash
bun run examples/tg-paywall/index.ts
```

---

## ☁️ Serverless Deployment (Cloud Functions)

Этот проект идеально подходит для деплоя в облако как Cloud Function (Webhooks). Это позволяет не держать сервер запущенным 24/7 и платить только за реальные сообщения.

### Как задеплоить:
1.  **Точка входа**: Используйте файл `examples/tg-paywall/handler.ts`.
2.  **Среда**: Выберите Node.js 18+.
3.  **Переменные**: Установите `BOT_TOKEN` и `ADMIN_ID` в настройках функции.
4.  **Webhook**: После деплоя вы получите URL. Зарегистрируйте его в Telegram:
    `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_FUNCTION_URL>`

> **Важно для Prod**: Cloud Functions не имеют постоянной памяти. Чтобы данные не пропадали, замените `InMemoryPaywallAdapter` в `paywall.composition.ts` на реальный адаптер базы данных (PostgreSQL/MongoDB).

---

## ✅ Реализованные сценарии (Use Cases)

- [x] **Мультиканальность**: Один план = один конкретный канал (через `channelId`).
- [x] **Smart Access**: Бот генерирует уникальные одноразовые ссылки через `confirmPaymentCommand`.
- [x] **Admin Force**: Эксперт может вручную отозвать доступ и забанить нарушителя прямо из бота.
- [x] **Auto-Expiration**: Воркер находит просроченные подписки и автоматически очищает каналы.

---

**TG Paywall Service** — это ваш фундамент для создания прибыльного SaaS-бизнеса в экосистеме Telegram. Начните с архитектуры, которая не подведет.

*Powered by [SotaJS](https://github.com/maxdev1/sotajs)*
