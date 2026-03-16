PRD: Open-Source Telegram Paywall Service
1. Product Vision (Видение продукта)

Создать коробочный, архитектурно чистый open-source сервис для монетизации закрытых Telegram-каналов и сообществ. Продукт берет на себя полный цикл подписки: от генерации ссылки на оплату до автоматического кика пользователя по истечении срока подписки. Архитектура строится на принципах DDD (Domain-Driven Design) с упором на абстракцию платежей и контроля доступа (Access Control as a Domain Model).
2. Основные метрики успеха (Success Metrics для MVP)

    Time-to-deploy: Разработчик может поднять и настроить сервис локально менее чем за 15 минут через Docker Compose.

    Success workflow rate: 100% успешных оплат завершаются выдачей доступа (без ручного вмешательства).

    Expiration accuracy: 100% пользователей с истекшей подпиской удаляются из канала в течение 1 часа (шаг работы Worker-а).

3. Архитектура и Технический Стек (Non-Functional Requirements)

    Язык и Среда: Node.js, TypeScript

    База данных: PostgreSQL (для доменных сущностей), Redis (для очередей/кеширования)

    Telegram API: библиотека Telegraf

    Инфраструктура: Docker, Docker Compose

    Структура репозитория (Модульный монолит):

        /core (доменные модели)

        /subscription-service (бизнес-логика)

        /telegram-adapter

        /payment-adapter

        /worker (cron jobs)

        /demo-bot (UI)

4. Доменные сущности (DDD Model)

    User: id, tg_id, username

    Plan: id, name, price, currency, duration_days

    Subscription: subscription_id, user_id, plan_id, status (pending, active, expired, cancelled), expires_at

    Payment: id, subscription_id, provider, external_id, amount, status

    AccessGrant: user_id, resource_id, resource_type (telegram_channel, telegram_chat), status

5. Epics & User Stories (Требования)
Epic 1: Платежный флоу (Checkout & Payments)

    Story 1.1: Как Подписчик, я хочу нажать кнопку "Подписаться" в боте и получить уникальную ссылку на оплату, чтобы купить доступ.

    Story 1.2: Как Система, я хочу абстрагировать платежных провайдеров (Stripe, TG Payments), чтобы добавление новой платежной системы не ломало ядро.

    Story 1.3: Как Система, я хочу получать Webhook от платежной системы (POST /payments/webhook), чтобы подтверждать платеж и активировать Subscription.

Epic 2: Контроль доступа (Access Control Domain)

    Story 2.1 (Инсайт): Как Система, при активации подписки я хочу создавать AccessGrant для пользователя на конкретный ресурс (граф доступов), чтобы в будущем легко выдавать бандлы (Канал + Чат).

    Story 2.2: Как Подписчик, после успешной оплаты я хочу мгновенно получить одноразовую invite link или автоматический approve заявки на вступление, чтобы попасть в канал.

    Story 2.3: Как Администратор, я должен добавить бота в канал как админа с правами "invite users" и "ban users", чтобы магия работала.

Epic 3: Жизненный цикл подписки (Lifecycle & Expiration)

    Story 3.1: Как Система, я хочу иметь фоновый процесс (Expiration Worker), который регулярно проверяет Subscription.expires_at, чтобы находить просроченные подписки.

    Story 3.2: Как Система, когда подписка истекает, я хочу вызывать метод banChatMember (с последующим unban, чтобы не навсегда), чтобы забрать AccessGrant у пользователя.

Epic 4: REST API (Management API)

    Story 4.1: Как Администратор (через UI или Postman), я хочу создавать тарифы (POST /plans).

    Story 4.2: Как Система, я должна предоставлять методы для выдачи (POST /access/grant) и отзыва (DELETE /access/revoke) доступа извне.

6. Идеальный сценарий использования (Showcase/Demo Workflow)

    Пользователь отправляет /start боту.

    Бот предлагает Тариф (Plan) -> Пользователь жмет "Оплатить".

    Бот через Payment Adapter генерирует ссылку на оплату.

    Пользователь оплачивает (эмуляция или реальный Stripe Test Mode).

    Система ловит Webhook -> Меняет статус Subscription на active -> Создает AccessGrant.

    Бот отправляет пользователю сообщение: "Оплата прошла! Вот ваша персональная ссылка на вступление".

    Пользователь вступает в канал.

    Спустя N дней (или минут в демо): Cron worker находит истекшую подписку и автоматически исключает пользователя.

7. Roadmap (План развития)
v1 (Текущий MVP - Scope PRD)

    ✅ Единоразовая подписка (на заданный срок).

    ✅ Абстракция платежей (реализован 1 провайдер: Stripe или TG Payments).

    ✅ Доступ в один Telegram-канал.

    ✅ Expiration Worker (удаление по сроку).

    ✅ Docker-сборка.

v2 (Next Steps)

    🔄 Рекуррентные платежи (автосписание).

    🔄 Поддержка нескольких каналов/чатов для одного бота.

    🔄 Продвинутая генерация Invite Links (с ограничениями по времени и кол-ву).

v3 (Future Vision)

    🚀 Интеграция с Discord (выдача ролей через Access Control).

    🚀 Community Bundles (Один тариф = Канал в ТГ + Чат в ТГ + Роль в Discord + доступ к Web-порталу).