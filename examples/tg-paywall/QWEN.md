# TG Paywall Service - Project Context

## Project Overview

**TG Paywall** is a production-ready Telegram bot service for monetizing private communities through subscription-based access control. Built with **SotaJS** framework, it demonstrates **Hexagonal Architecture** and **Domain-Driven Design (DDD)** principles for enterprise-grade TypeScript applications.

### Core Value Proposition
- **White-label SaaS**: Each expert/blogger gets their own branded bot while sharing centralized business logic
- **Payment Agnostic**: Supports multiple providers (Stripe, YooKassa, Robokassa, Prodamus) via adapter pattern
- **Access Control as Domain Model**: Rich domain aggregates enforce business invariants at code level
- **CQRS Architecture**: Clear separation between commands (state changes) and queries (reads)

### Tech Stack
- **Runtime**: Node.js / Bun
- **Language**: TypeScript
- **Framework**: SotaJS (custom DDD framework)
- **Telegram Library**: grammY
- **Database**: SQLite (development) / PostgreSQL (production-ready adapters)
- **Deployment**: Serverless-ready (Cloud Functions, Webhooks)

---

## Architecture

```
examples/tg-paywall/
├── domain/                    # Rich Domain Models (Aggregates)
│   ├── plan.aggregate.ts      # Tariff plans with channelId
│   ├── subscription.aggregate.ts  # Payment lifecycle, status machine
│   └── access-grant.aggregate.ts  # Access control domain model
│
├── application/               # Pure Business Logic (CQRS)
│   ├── commands/              # Write operations (confirmPayment, revokeAccess)
│   ├── queries/               # Read operations (listPlans, findSubscription)
│   ├── features/              # Feature modules with ports
│   └── ports/                 # Interface contracts for adapters
│
├── infrastructure/            # Ports & Adapters
│   ├── adapters/
│   │   ├── grammy-bot.ts     # Real Telegram bot on grammY
│   │   ├── telegram-bot.ts   # Simulation adapter for demos
│   │   └── payment/*.ts      # Payment provider implementations
│   └── network-interceptor.ts # Mock network for testing
│
├── paywall.composition.ts     # Composition Root (DI)
├── paywall.test.ts            # 100% business logic coverage
├── index.ts                   # Entry point (bot or simulation)
└── handler.ts                 # Serverless webhook handler
```

### Key Architectural Patterns

1. **Rich Domain Model**: Aggregates (`Plan`, `Subscription`, `AccessGrant`) enforce invariants internally
2. **Hexagonal Architecture**: Business logic isolated from external concerns (Telegram API, payments, DB)
3. **CQRS**: Commands mutate state, queries read state (no side effects)
4. **Dependency Injection**: All adapters bound at composition root via `core.bindFeatures()`

---

## Building and Running

### Prerequisites
- Bun runtime (`bun install`)
- Telegram Bot Token (from @BotFather)

### Quick Start

```bash
# Run simulation (no token required)
bun run examples/tg-paywall/index.ts

# Run real bot
BOT_TOKEN=your_token ADMIN_ID=your_chat_id bun run examples/tg-paywall/index.ts

# Run tests
bun test examples/tg-paywall/paywall.test.ts
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram bot token from @BotFather | `123456:ABC-DEF1234...` |
| `ADMIN_ID` | Telegram user ID for admin panel | `637190760` |
| `PAYMENT_PROVIDER` | Payment gateway (`mock`, `stripe`, `yookassa`, `robokassa`, `prodamus`) | `mock` |
| `MOCK_NETWORK` | Enable network interception for testing | `true` |
| `SQLITE_PATH` | Custom database path | `./paywall.sqlite` |
| `PAYMENT_SIGNING_SECRET` | Secret for webhook signature verification | `demo_secret_123` |

### Serverless Deployment

```bash
# Deploy handler.ts as Cloud Function
# Set BOT_TOKEN and ADMIN_ID in function environment
# Configure webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FUNCTION_URL>
```

---

## Development Conventions

### Code Style
- **TypeScript strict mode** with Zod schemas for runtime validation
- **Aggregate pattern**: Domain logic lives in aggregates, not services
- **No anemic models**: Entities have behavior (`activate()`, `expire()`, `revoke()`)

### Testing Practices
- **Fixture-driven tests**: In-memory adapters for isolated unit tests
- **Full workflow tests**: End-to-end subscription flow verification
- **Network mocking**: `MOCK_NETWORK=true` intercepts fetch for integration testing

### Domain Invariants (Examples)
```typescript
// Cannot activate from non-pending state
subscription.actions.activate(duration); // throws if status !== "pending"

// Active subscription requires expiration date
if (status === "active" && !expiresAt) throw new Error();

// Cannot revoke already inactive subscription
if (status === "cancelled" || status === "expired") throw new Error();
```

### Payment Provider Abstraction
All payment adapters implement the same port:
```typescript
interface PaymentProviderPort {
  paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }>;
}
```

Switch providers by changing `PAYMENT_PROVIDER` env var—no code changes needed.

---

## Key Use Cases

### 1. Subscription Flow
```
/start → list tariffs → select plan → generate payment link → 
user pays → webhook received → confirmPaymentCommand → 
create AccessGrant → send invite link → user joins channel
```

### 2. Access Expiration (Worker)
```
Cron job → findExpiredSubscriptions() → 
revokeExpiredSubscriptionsCommand → 
revokeTelegramAccess() (ban member) → update status to "expired"
```

### 3. Manual Admin Revocation
```
/admin → list subscribers → select user → 
revokeAccessCommand → remove from channel
```

---

## Database Schema (SQLite)

**Tables**: `plans`, `subscriptions`, `access_grants`, `templates`

Key relationships:
- `Subscription` → `Plan` (many-to-one via `planId`)
- `AccessGrant` → `Subscription` (one-to-one via `subscriptionId`)
- `AccessGrant` → `User` (many-to-one via `userId`)

---

## Common Operations

### Create a Plan (via bot)
```
/admin → ➕ Создать продукт → follow wizard
```

### Check User Subscription
```typescript
const status = await findSubscriptionByUserIdQuery({ userId: "12345" });
```

### Revoke Access Programmatically
```typescript
await revokeAccessCommand({ userId: "12345", subscriptionId: "uuid" });
```

### Customize Onboarding Messages
```
/admin → 📝 Тексты онбординга → select template → send new content
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Subscription not found` on webhook | Ensure shared DB path in `paywall.composition.ts` |
| TMA button requires HTTPS | Use `dev-launcher.ts` for auto-tunnel or set `TMA_URL` |
| Webhook signature fails | Check `PAYMENT_SIGNING_SECRET` matches in bot and payment gateway |
| Bot doesn't respond to /start | Verify `BOT_TOKEN` is set and bot is not already running elsewhere |

---

## Related Documentation

- `README.md` — High-level overview and value proposition
- `prd.md` — Product Requirements Document
- `MBSE_MODEL.md` — Stakeholder needs and system requirements
- `DEV_LOG.md` — Engineering challenges and solutions
- `PITCH.md` — Business pitch and market positioning
- `USER_GUIDE.md` — End-user instructions

---

## Project Status

**MVP Complete**: Single-channel subscriptions, multi-provider payments, expiration worker, admin panel

**Roadmap**:
- v2: Recurring payments, multi-channel bundles
- v3: Discord integration, web portal access
