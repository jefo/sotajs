<p align="center">
  <h1 align="center">🔐 TG Paywall</h1>
  <p align="center">
    <strong>Open-source Telegram subscription bot. Deploy for your client in 15 minutes.</strong>
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="docs/QUICK_START.md">Full Deploy Guide</a> •
    <a href="#self-host-vs-managed">Hosting</a> •
    <a href="#architecture">Architecture</a>
  </p>
</p>

---

**TG Paywall** handles the entire subscription lifecycle for private Telegram channels: payment → access → expiration → revoke. You deploy it, your client's audience pays, the bot does the rest.

```
Expert posts in their channel → Subscriber clicks "Pay" → Bot confirms payment
→ Bot grants access via invite link → Subscription expires → Bot revokes access
```

## Why TG Paywall

| For You (Developer) | For Your Client (Expert/Blogger) |
|---|---|
| Open source — inspect every line, fork, extend | Own branded bot (`@TheirName_Bot`) |
| One codebase, unlimited client projects | Zero admin work — everything automated |
| Charge setup fee + monthly support | Professional paywall in minutes, not weeks |
| Self-host free or use managed hosting | Supports Stripe, YooKassa, Robokassa, Prodamus |

### The Business Case

You're a freelancer or agency. A client asks: *"I need a paid subscription bot for my Telegram channel."*

Without TG Paywall: you build from scratch (20-40 hours), handle edge cases, maintain it forever.

With TG Paywall: clone → configure → deploy. **Bill your client $300-500 for setup, $50-100/mo for support.** Your cost: 15 minutes + hosting.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/jefo/sotajs.git
cd sotajs/examples/tg-paywall

# 2. Install
bun install

# 3. Run simulation (no token needed)
bun run index.ts

# 4. Run real bot
BOT_TOKEN=your_token ADMIN_ID=your_telegram_id bun run index.ts
```

That's it. The bot is running. [Full 15-minute deploy guide →](docs/QUICK_START.md)

## Features

- **🔒 Subscription Management** — Plans with configurable pricing, duration, and channel binding
- **💳 Multi-Provider Payments** — Stripe, YooKassa, Robokassa, Prodamus (webhook-based)
- **🔗 Secure Access** — One-time invite links via Join Requests (no link sharing exploits)
- **⏰ Auto-Expiration** — Background worker finds expired subscriptions and revokes access
- **🎨 White-Label** — Each client gets their own branded bot with customizable messages
- **📝 Template Engine** — Admin customizes all bot messages (welcome, payment, expiration) in real-time
- **📢 Marketing Kit** — Bot generates ready-to-post promotional messages with deep links
- **🛡️ Admin Controls** — Manual revoke, ban, subscription management from the bot

## Self-Host vs Managed

| | Self-Host (Free) | Managed Hosting |
|---|---|---|
| **Cost** | $0 | $X/mo per instance |
| **Setup** | You handle server, DB, monitoring | One-command deploy |
| **Updates** | `git pull` | Automatic |
| **Support** | Community (GitHub Issues) | Priority support |
| **Best for** | Technical clients, cost-sensitive | Most client projects |

> **Self-host** if you already have infrastructure or your client is technical.
> **Managed** if you want to deploy and forget — most freelancers choose this because spinning up Cloud Functions + DB + monitoring for a single project isn't worth the overhead.

## Architecture

Built on **Hexagonal Architecture** (Ports & Adapters) with **DDD** and **CQRS**:

```
┌─────────────────────────────────────────────────────┐
│                   Driving Adapters                  │
│         grammY Bot  ·  Webhook Server               │
├─────────────────────────────────────────────────────┤
│                   Application Layer                 │
│                                                     │
│  Commands:                  Queries:                │
│  · confirmPayment           · listPlans             │
│  · createPlan               · findSubscription      │
│  · subscribeUser            · checkAccess           │
│  · revokeAccess             · listActive            │
│  · revokeExpired            · getFormattedMessage    │
├─────────────────────────────────────────────────────┤
│                    Domain Layer                     │
│                                                     │
│  Aggregates:                                        │
│  · Plan (pricing, duration, channel binding)        │
│  · Subscription (lifecycle: pending→active→expired) │
│  · AccessGrant (who has access to what)             │
├─────────────────────────────────────────────────────┤
│                   Driven Adapters                   │
│       SQLite  ·  In-Memory  ·  Telegram API         │
└─────────────────────────────────────────────────────┘
```

**Why this matters:**
- Swap payment providers without touching business logic
- Test everything with in-memory adapters (no DB, no API calls)
- Add Discord/Slack access grants by implementing one adapter

```
examples/tg-paywall/
├── domain/                 # Rich Domain Models (Aggregates with invariants)
├── application/
│   ├── commands/           # Write operations (CQRS)
│   ├── queries/            # Read operations (CQRS)
│   ├── ports/              # Abstract contracts
│   └── features/           # Feature groupings (DI)
├── infrastructure/
│   └── adapters/           # Concrete implementations
├── paywall.composition.ts  # Composition Root (DI wiring)
├── paywall.test.ts         # Black-box domain tests
└── index.ts                # Entry point
```

## Deployment Options

### Option A: Long Polling (Development & Small Scale)
```bash
BOT_TOKEN=xxx ADMIN_ID=123 bun run index.ts
```

### Option B: Cloud Functions (Production)
Use `handler.ts` as the entrypoint for serverless deployment (Yandex Cloud, AWS Lambda, Google Cloud Functions). Pay only for actual messages.

```bash
# Set webhook after deploy
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_FUNCTION_URL>"
```

### Option C: Docker (Self-Host)
```bash
docker compose up -d  # Coming soon
```

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) / Node.js 18+ |
| Framework | [SotaJS](https://github.com/jefo/sotajs) (Hexagonal Architecture) |
| Telegram | [grammY](https://grammy.dev) |
| Database | SQLite (default) / PostgreSQL (production) |
| Validation | [Zod](https://zod.dev) |
| Architecture | DDD, CQRS, Ports & Adapters |

## Contributing

TG Paywall is open source under the MIT license. Contributions welcome:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/stripe-adapter`)
3. Write tests (`bun test`)
4. Submit a PR

**Good first issues:**
- [ ] Docker Compose setup
- [ ] PostgreSQL adapter
- [ ] Stripe payment adapter (real, not mock)
- [ ] Discord access grant adapter
- [ ] i18n support

## License

MIT — use it for free, commercially, forever. No strings attached.

---

<p align="center">
  <sub>Built with <a href="https://github.com/jefo/sotajs">SotaJS</a> · Hexagonal Architecture · DDD · CQRS</sub>
</p>
