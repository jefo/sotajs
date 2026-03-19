import Database from "bun:sqlite";

const PORT = process.env.PAYMENT_PORT || 3000;
const HOST = process.env.PAYMENT_HOST || "lvh.me";
const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || `http://lvh.me:4000/webhook/payment`;

// Общая база данных
const sqliteDbPath = process.env.SQLITE_PATH || `${import.meta.dir}/paywall.sqlite`;
const db = new Database(sqliteDbPath);

/**
 * Demo Payment & TMA Gateway
 */
Bun.serve({
  port: Number(PORT),
  async fetch(req) {
    const url = new URL(req.url);
    const headers = {
      "Content-Type": "text/html",
      "ngrok-skip-browser-warning": "true"
    };

    // API endpoint для создания подписки
    if (url.pathname === "/api/create-subscription" && req.method === "POST") {
      try {
        const { userId, planId } = await req.json();
        
        if (!userId || !planId) {
          return new Response(JSON.stringify({ error: "userId and planId required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json", ...headers }
          });
        }

        // Создаем подписку в БД
        const subscriptionId = crypto.randomUUID();
        const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(planId) as any;
        
        if (!plan) {
          return new Response(JSON.stringify({ error: "Plan not found" }), { 
            status: 404,
            headers: { "Content-Type": "application/json", ...headers }
          });
        }

        const now = new Date().toISOString();
        
        db.run(`
          INSERT INTO subscriptions (id, user_id, plan_id, status, price, currency, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
        `, subscriptionId, userId, planId, plan.price, plan.currency, now, now);

        console.log(`[TMA] Created subscription ${subscriptionId} for user ${userId}, plan ${planId}`);

        return new Response(JSON.stringify({ 
          subscriptionId,
          planName: plan.name,
          amount: plan.price,
          currency: plan.currency
        }), { 
          headers: { "Content-Type": "application/json", ...headers }
        });
      } catch (e: any) {
        console.error(`[TMA] Error creating subscription: ${e.message}`);
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500,
          headers: { "Content-Type": "application/json", ...headers }
        });
      }
    }

    // 1. Витрина TMA: /tma
    if (url.pathname === "/tma") {
      const plans = db.prepare("SELECT * FROM plans").all() as any[];

      return new Response(
        `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Product Accelerator</title>
          <script src="https://telegram.org/js/telegram-web-app.js"></script>
          <style>
            :root { --tg-theme-bg-color: #ffffff; --tg-theme-text-color: #000000; --tg-theme-button-color: #007bff; --tg-theme-button-text-color: #ffffff; }
            body { font-family: -apple-system, sans-serif; background: var(--tg-theme-bg-color); color: var(--tg-theme-text-color); margin: 0; padding: 16px; overflow-x: hidden; }
            .header { text-align: center; padding: 20px 0; }
            .header h1 { font-size: 24px; margin: 0; font-weight: 800; }
            .header p { opacity: 0.6; font-size: 14px; margin-top: 4px; }
            .grid { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
            .card { border: 1px solid rgba(0,0,0,0.1); padding: 16px; border-radius: 12px; cursor: pointer; transition: transform 0.1s; position: relative; }
            .card:active { transform: scale(0.98); }
            .card.selected { border: 2px solid var(--tg-theme-button-color); background: rgba(0,123,255,0.05); }
            .card-title { font-weight: 700; font-size: 18px; }
            .card-price { font-weight: 800; color: var(--tg-theme-button-color); margin-top: 4px; }
            .card-features { font-size: 12px; opacity: 0.6; margin-top: 8px; list-style: none; padding: 0; }
            .card-features li::before { content: "• "; color: var(--tg-theme-button-color); }
            .badge { position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; }
            .badge-popular { background: #dc3545; }
            .loading { text-align: center; padding: 20px; display: none; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invest in Your Career</h1>
            <p>Choose your membership format</p>
          </div>

          <div class="loading" id="loading">⏳ Creating subscription...</div>

          <div class="grid">
            ${plans.map(p => {
              const isLifetime = p.duration_days > 365;
              return `
                <div class="card" onclick="selectPlan('${p.id}', '${p.name}', ${p.price})">
                  ${isLifetime ? '<div class="badge badge-popular">Lifetime</div>' : ''}
                  <div class="card-title">${p.name.replace(/ \\(.*\\)/, '')}</div>
                  <div class="card-price">${p.price} ${p.currency}</div>
                  <ul class="card-features">
                    <li>Access Level: ${p.access_level.toUpperCase()}</li>
                    <li>Duration: ${isLifetime ? 'Forever' : p.duration_days + ' days'}</li>
                    <li>One-time payment</li>
                  </ul>
                </div>
              `;
            }).join("")}
          </div>

          <script>
            const tg = window.Telegram.WebApp;
            tg.expand();
            tg.MainButton.setText('Choose membership');
            tg.MainButton.hide();

            let selectedPlanId = null;
            const userId = tg.initDataUnsafe.user?.id?.toString() || "demo_user";

            function selectPlan(id, name, price) {
              selectedPlanId = id;
              document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
              event.currentTarget.classList.add('selected');

              tg.MainButton.setText('Invest in ' + name.split(' ')[0]);
              tg.MainButton.show();
            }

            tg.onEvent('mainButtonClicked', async function() {
              tg.MainButton.showProgress();
              document.getElementById('loading').style.display = 'block';
              // Скрываем кнопку чтобы не мешала
              tg.MainButton.hide();

              try {
                // Создаем подписку через API
                const res = await fetch('/api/create-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, planId: selectedPlanId })
                });

                if (!res.ok) throw new Error('Failed to create subscription');

                const data = await res.json();
                
                // Перенаправляем на страницу оплаты с subscriptionId
                window.location.href = '/pay/' + data.subscriptionId;
              } catch (err) {
                tg.showAlert('Error: ' + err.message);
                tg.MainButton.hideProgress();
                document.getElementById('loading').style.display = 'none';
              }
            });
          </script>
        </body>
        </html>
        `,
        { headers: { ...headers, "Content-Type": "text/html" } }
      );
    }

    // 2. Страница оплаты (как раньше, но с поддержкой TMA)
    if (url.pathname.startsWith("/pay/")) {
      const subIdOrPlanId = url.pathname.split("/")[2];
      const provider = url.searchParams.get("provider") || "tma";

      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Secure Payment</title>
          <script src="https://telegram.org/js/telegram-web-app.js"></script>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f2f5; }
            .card { background: white; padding: 2rem; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; }
            button { background: #28a745; color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-size: 1.1rem; cursor: pointer; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            .success { display: none; color: #28a745; font-size: 1.2rem; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Complete Payment</h2>
            <p>ID: ${subIdOrPlanId}</p>
            <button id="payBtn" onclick="pay()">Confirm & Pay</button>
            <div class="success" id="success">✅ Payment Success! Redirecting...</div>
          </div>
          <script>
            const tg = window.Telegram.WebApp;
            tg.ready();
            // Скрываем главную кнопку Telegram чтобы не сбивала с толку
            tg.MainButton.hide();
            
            async function pay() {
              const btn = document.getElementById('payBtn');
              const success = document.getElementById('success');
              
              btn.disabled = true;
              btn.textContent = 'Processing...';

              try {
                const res = await fetch('/gateway/process', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscriptionId: '${subIdOrPlanId}' })
                });
                
                if (res.ok) {
                  btn.style.display = 'none';
                  success.style.display = 'block';
                  
                  // Через 2 секунды закрываем TMA или перенаправляем в бот
                  setTimeout(() => {
                    if (tg && tg.close) {
                      tg.close();
                    } else {
                      // Фоллбэк: открываем бота
                      window.location.href = 'https://t.me/EasyPaywallBot';
                    }
                  }, 2000);
                } else {
                  btn.disabled = false;
                  btn.textContent = 'Try Again';
                  alert('Payment failed. Please try again.');
                }
              } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Try Again';
                alert('Payment error: ' + err.message);
              }
            }
          </script>
        </body>
        </html>
        `,
        { headers }
      );
    }

    // 3. Обработка шлюза (Webhooks)
    if (url.pathname === "/gateway/process" && req.method === "POST") {
      try {
        const { subscriptionId } = await req.json();
        const SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || "demo_secret_123";
        const signature = Buffer.from(`${subscriptionId}:${SIGNING_SECRET}`).toString("base64");

        console.log(`[GATEWAY] 💰 Processing payment for ${subscriptionId}...`);

        await fetch(BOT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Signature": signature },
          body: JSON.stringify({ subscriptionId })
        });

        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    return new Response("TMA & Payment Server Running", { status: 200, headers });
  }
});

console.log(`\n🚀 TMA Simulator: http://${HOST}:${PORT}/tma`);
console.log(`📡 Bot Webhook: ${BOT_WEBHOOK_URL}\n`);
