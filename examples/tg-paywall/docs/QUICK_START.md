# Quick Start: Deploy TG Paywall in 15 Minutes

This guide takes you from zero to a working Telegram paywall bot. By the end, you'll have a bot that accepts payments and manages access to a private channel.

---

## Prerequisites

| What | Why | How to Get |
|---|---|---|
| **Bun** (or Node.js 18+) | Runtime | [bun.sh](https://bun.sh) |
| **Telegram Bot Token** | Bot identity | [@BotFather](https://t.me/BotFather) → `/newbot` |
| **Your Telegram ID** | Admin access | [@userinfobot](https://t.me/userinfobot) |
| **Private Channel** | What you're selling access to | Create one in Telegram |

## Step 1: Clone & Install (2 min)

```bash
git clone https://github.com/jefo/sotajs.git
cd sotajs
bun install
```

## Step 2: Create the Bot in Telegram (3 min)

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot`, choose a name (e.g., "Ivan's Premium Channel Bot")
3. Copy the token — you'll need it in Step 3
4. Send `/setcommands` to BotFather and set:
   ```
   start - Start the bot
   plans - View available plans
   my - Check my subscription
   ```

## Step 3: Set Up the Channel (3 min)

1. Create a **private channel** in Telegram (or use an existing one)
2. Add your bot as an **administrator** with these permissions:
   - ✅ Invite Users via Link
   - ✅ Ban Users
3. Get the channel ID:
   - Forward any message from the channel to [@userinfobot](https://t.me/userinfobot)
   - It will show the channel ID (starts with `-100...`)

## Step 4: Configure & Run (2 min)

Create `.env` in the project root:

```bash
# examples/tg-paywall/.env
BOT_TOKEN=your_bot_token_here
ADMIN_ID=your_telegram_id_here
```

Run the bot:

```bash
BOT_TOKEN=your_token ADMIN_ID=your_id bun run examples/tg-paywall/index.ts
```

You should see:
```
🚀 Starting real Telegram Bot (grammY)...
📡 Bot Webhook Server listening on port 4000
✅ Bot @YourBot is running!
```

## Step 5: Create a Plan & Test (5 min)

1. Open your bot in Telegram
2. As admin, create a plan:
   - The bot provides admin commands for plan management
   - Set plan name, price, duration, and target channel ID

3. Test as a subscriber:
   - Open the bot from a different Telegram account (or ask a friend)
   - Send `/start` → see available plans
   - Click "Pay" → go through the payment flow
   - After payment confirmation → bot sends invite link
   - Click invite → you're in the channel

4. Test expiration:
   - The expiration worker will automatically revoke access when the subscription ends

---

## Deploy to Production

### Option A: Managed Hosting (Recommended)

> Deploy on our infrastructure — $X/mo per instance. No servers to manage, no monitoring to set up.

```bash
# Coming soon — one-command deploy
bun run examples/tg-paywall/scripts/deploy.ts
```

### Option B: Self-Host (Free)

You handle the infrastructure yourself:

**Cloud Functions (Serverless):**
1. Use `handler.ts` as the entrypoint
2. Deploy to Yandex Cloud / AWS Lambda / Google Cloud Functions
3. Set environment variables: `BOT_TOKEN`, `ADMIN_ID`
4. Register webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_FUNCTION_URL>"
   ```

**VPS / Dedicated Server:**
```bash
# Run with process manager
BOT_TOKEN=xxx ADMIN_ID=123 pm2 start "bun run examples/tg-paywall/index.ts" --name tg-paywall
```

> **Production note:** The default setup uses SQLite. For multi-instance or high-load, swap to PostgreSQL by implementing a new adapter (the architecture makes this a single-file change).

---

## What Your Client Gets

After deployment, the client's audience sees:

1. **Branded bot** with the client's name and description
2. **Inline payment flow** — select plan → pay → get access
3. **Automatic access management** — no manual approvals
4. **Subscription expiration** — fair access control, no freeloaders
5. **Customizable messages** — the client edits welcome/payment/expiry texts through the bot

## What You Earn

| Revenue Source | Amount | Notes |
|---|---|---|
| Setup fee | $200–500 | One-time, you set the price |
| Monthly support | $50–100/mo | Updates, monitoring, plan changes |
| Infrastructure markup | 20–50% | If using managed hosting, pass through with margin |
| Additional bots | Same pricing | Each new client project = new revenue |

A freelancer with 5 active clients at $75/mo support = **$375/mo recurring** + setup fees.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Bot doesn't respond | Check `BOT_TOKEN` is correct, bot is not blocked |
| "Not admin" errors | Ensure bot has admin rights in the channel |
| Webhook not received | Check port 4000 is accessible, URL is correct |
| Payment not confirmed | Check webhook endpoint logs, verify signature |

## Next Steps

- [ ] Connect a real payment provider (Stripe, YooKassa)
- [ ] Set up a custom domain for the webhook endpoint
- [ ] Configure auto-restart with pm2 or systemd
- [ ] Set up monitoring (Uptime Robot, Healthchecks.io)

---

*Need help? [Open an issue on GitHub](https://github.com/jefo/sotajs/issues) or reach out in our Telegram dev chat.*
