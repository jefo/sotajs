import Database from "bun:sqlite";

const PORT = process.env.PAYMENT_PORT || 3000;
const HOST = process.env.PAYMENT_HOST || "lvh.me";
const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || `http://lvh.me:4000/webhook/payment`;

// Общая база данных
const sqliteDbPath = process.env.SQLITE_PATH || `${import.meta.dir}/paywall.sqlite`;
const db = new Database(sqliteDbPath);

// Хранилище SMS кодов в памяти (для демо)
const smsCodes = new Map<string, { code: string; subscriptionId: string; amount: number }>();

/**
 * Demo Payment & TMA Gateway с красивым UI
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
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            :root {
              --tg-theme-bg-color: #ffffff;
              --tg-theme-text-color: #1a1a1a;
              --tg-theme-button-color: #007bff;
              --tg-theme-button-text-color: #ffffff;
              --tg-theme-secondary-bg-color: #f5f5f7;
              --tg-theme-hint-color: #8e8e93;
              --tg-theme-link-color: #007bff;
              --success-color: #34c759;
              --error-color: #ff3b30;
              --card-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            * { box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              background: var(--tg-theme-bg-color);
              color: var(--tg-theme-text-color);
              margin: 0;
              padding: 0;
              overflow-x: hidden;
              -webkit-font-smoothing: antialiased;
            }
            .container { padding: 20px 16px; }
            .header { text-align: center; padding: 24px 0 16px; }
            .header h1 {
              font-size: 28px;
              margin: 0 0 8px;
              font-weight: 800;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .header p {
              opacity: 0.7;
              font-size: 15px;
              margin: 0;
              line-height: 1.5;
            }
            .grid { display: flex; flex-direction: column; gap: 14px; margin-top: 24px; }
            .card {
              border: 2px solid rgba(0,0,0,0.06);
              padding: 20px;
              border-radius: 16px;
              cursor: pointer;
              transition: all 0.2s ease;
              position: relative;
              background: var(--tg-theme-bg-color);
              box-shadow: var(--card-shadow);
            }
            .card:active { transform: scale(0.98); }
            .card.selected {
              border-color: var(--tg-theme-button-color);
              background: linear-gradient(135deg, rgba(0,123,255,0.08) 0%, rgba(118,75,162,0.08) 100%);
            }
            .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
            .card-title { font-weight: 700; font-size: 17px; line-height: 1.3; }
            .card-price {
              font-weight: 800;
              font-size: 24px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-top: 8px;
            }
            .card-features {
              font-size: 13px;
              opacity: 0.7;
              margin-top: 12px;
              list-style: none;
              padding: 0;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .card-features li { display: flex; align-items: center; gap: 8px; }
            .card-features li::before {
              content: "✓";
              color: var(--success-color);
              font-weight: 700;
              font-size: 14px;
            }
            .badge {
              position: absolute;
              top: 12px;
              right: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
              color: white;
              padding: 4px 8px;
              border-radius: 6px;
              letter-spacing: 0.5px;
            }
            .badge-popular {
              background: linear-gradient(135deg, #ff6b6b 0%, #ff3b30 100%);
            }
            .loading {
              text-align: center;
              padding: 40px 20px;
              display: none;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(0,123,255,0.1);
              border-top-color: var(--tg-theme-button-color);
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .loading-text { font-size: 15px; font-weight: 500; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invest in Your Career</h1>
              <p>Choose your membership format and join the elite community</p>
            </div>

            <div class="loading" id="loading">
              <div class="spinner"></div>
              <div class="loading-text">Creating your subscription...</div>
            </div>

            <div class="grid">
              ${plans.map(p => {
                const isLifetime = p.duration_days > 365;
                return `
                  <div class="card" onclick="selectPlan('${p.id}', '${p.name}', ${p.price})">
                    ${isLifetime ? '<div class="badge badge-popular">Lifetime</div>' : ''}
                    <div class="card-header">
                      <div class="card-title">${p.name.replace(/ \\(.*\\)/, '')}</div>
                    </div>
                    <div class="card-price">${p.price} ${p.currency}</div>
                    <ul class="card-features">
                      <li>Access Level: <strong>${p.access_level.toUpperCase()}</strong></li>
                      <li>Duration: ${isLifetime ? 'Forever Access' : p.duration_days + ' days'}</li>
                      <li>One-time payment</li>
                      <li>Instant access</li>
                    </ul>
                  </div>
                `;
              }).join("")}
            </div>
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

              tg.MainButton.setText('Continue - ' + price + ' ' + (price === 14990 ? 'RUB' : 'RUB'));
              tg.MainButton.show();
            }

            tg.onEvent('mainButtonClicked', async function() {
              tg.MainButton.showProgress();
              document.getElementById('loading').style.display = 'block';
              tg.MainButton.hide();

              try {
                const res = await fetch('/api/create-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, planId: selectedPlanId })
                });

                if (!res.ok) throw new Error('Failed to create subscription');

                const data = await res.json();
                
                // Перенаправляем на страницу оплаты
                window.location.href = '/pay/' + data.subscriptionId;
              } catch (err) {
                tg.MainButton.hideProgress();
                document.getElementById('loading').style.display = 'none';
                tg.MainButton.show();
              }
            });
          </script>
        </body>
        </html>
        `,
        { headers: { ...headers, "Content-Type": "text/html" } }
      );
    }

    // 2. Страница оплаты с красивым UI и SMS верификацией
    if (url.pathname.startsWith("/pay/")) {
      const subscriptionId = url.pathname.split("/")[2];
      const subscription = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(subscriptionId) as any;
      
      if (!subscription) {
        return new Response("Subscription not found", { status: 404 });
      }

      const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(subscription.plan_id) as any;

      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Secure Payment</title>
          <script src="https://telegram.org/js/telegram-web-app.js"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            :root {
              --bg-color: #f5f5f7;
              --card-bg: #ffffff;
              --text-primary: #1a1a1a;
              --text-secondary: #8e8e93;
              --accent: #007bff;
              --success: #34c759;
              --error: #ff3b30;
              --border: rgba(0,0,0,0.08);
              --shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              background: var(--bg-color);
              color: var(--text-primary);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              -webkit-font-smoothing: antialiased;
            }
            .payment-card {
              background: var(--card-bg);
              border-radius: 24px;
              padding: 32px 24px;
              width: 100%;
              max-width: 420px;
              box-shadow: var(--shadow);
            }
            .secure-badge {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              background: linear-gradient(135deg, rgba(52,199,89,0.1) 0%, rgba(48,209,88,0.1) 100%);
              padding: 10px 16px;
              border-radius: 12px;
              margin-bottom: 24px;
            }
            .secure-badge svg { width: 20px; height: 20px; color: var(--success); }
            .secure-badge span { font-size: 13px; font-weight: 600; color: var(--success); }
            .plan-info { text-align: center; margin-bottom: 24px; }
            .plan-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
            .plan-price {
              font-size: 36px;
              font-weight: 800;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .plan-desc { font-size: 14px; color: var(--text-secondary); margin-top: 8px; }
            .step { display: none; }
            .step.active { display: block; }
            .step-header { text-align: center; margin-bottom: 24px; }
            .step-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
            .step-desc { font-size: 14px; color: var(--text-secondary); }
            .input-group { margin-bottom: 20px; }
            .input-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
            .input-field {
              width: 100%;
              padding: 16px;
              border: 2px solid var(--border);
              border-radius: 14px;
              font-size: 17px;
              font-weight: 500;
              transition: all 0.2s;
              background: var(--card-bg);
            }
            .input-field:focus {
              outline: none;
              border-color: var(--accent);
              box-shadow: 0 0 0 4px rgba(0,123,255,0.1);
            }
            .sms-input { letter-spacing: 8px; text-align: center; font-size: 24px !important; font-weight: 700; }
            .btn {
              width: 100%;
              padding: 18px;
              border: none;
              border-radius: 14px;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102,126,234,0.3);
            }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
            .btn:active { transform: translateY(0); }
            .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            .btn-secondary {
              background: var(--card-bg);
              color: var(--text-primary);
              border: 2px solid var(--border);
              box-shadow: none;
              margin-top: 12px;
            }
            .card-icons { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
            .card-icon {
              width: 48px;
              height: 32px;
              background: linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%);
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 700;
              color: var(--text-secondary);
              border: 1px solid var(--border);
            }
            .success-animation {
              text-align: center;
              padding: 20px;
            }
            .success-checkmark {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: scaleIn 0.4s ease;
            }
            .success-checkmark svg { width: 40px; height: 40px; color: white; }
            @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
            .success-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
            .success-desc { font-size: 15px; color: var(--text-secondary); }
            .error-message {
              background: rgba(255,59,48,0.1);
              color: var(--error);
              padding: 12px 16px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 20px;
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="payment-card">
            <div class="secure-badge">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span>Secure 256-bit SSL Encryption</span>
            </div>

            <div class="plan-info">
              <div class="plan-name">${plan?.name || 'Membership'}</div>
              <div class="plan-price">${subscription.price} ${subscription.currency}</div>
              <div class="plan-desc">One-time payment • Lifetime access</div>
            </div>

            <div class="card-icons">
              <div class="card-icon">VISA</div>
              <div class="card-icon">MC</div>
              <div class="card-icon">MIR</div>
              <div class="card-icon">SBP</div>
            </div>

            <!-- Step 1: Card Details -->
            <div class="step active" id="step1">
              <div class="step-header">
                <div class="step-title">Card Details</div>
                <div class="step-desc">Enter your payment information</div>
              </div>
              <div class="error-message" id="error1"></div>
              <div class="input-group">
                <label class="input-label">Card Number</label>
                <input type="text" class="input-field" placeholder="0000 0000 0000 0000" maxlength="19" id="cardNumber">
              </div>
              <div style="display: flex; gap: 12px;">
                <div class="input-group" style="flex: 1;">
                  <label class="input-label">Expiry Date</label>
                  <input type="text" class="input-field" placeholder="MM/YY" maxlength="5" id="expiry">
                </div>
                <div class="input-group" style="flex: 1;">
                  <label class="input-label">CVV</label>
                  <input type="password" class="input-field" placeholder="123" maxlength="3" id="cvv">
                </div>
              </div>
              <button class="btn" onclick="goToStep2()">Continue</button>
            </div>

            <!-- Step 2: SMS Verification -->
            <div class="step" id="step2">
              <div class="step-header">
                <div class="step-title">SMS Verification</div>
                <div class="step-desc">Enter the code sent to your phone</div>
              </div>
              <div class="error-message" id="error2"></div>
              <div class="input-group">
                <label class="input-label">Phone Number</label>
                <input type="tel" class="input-field" placeholder="+7 (999) 000-00-00" value="+7 (900) 123-45-67" id="phone">
              </div>
              <button class="btn" onclick="sendSMS()">Send Code</button>
              <button class="btn btn-secondary" onclick="goBackToStep1()">Back</button>
            </div>

            <!-- Step 3: Enter Code -->
            <div class="step" id="step3">
              <div class="step-header">
                <div class="step-title">Enter Verification Code</div>
                <div class="step-desc">We sent a code to your phone</div>
              </div>
              <div class="error-message" id="error3"></div>
              <div class="input-group">
                <input type="text" class="input-field sms-input" placeholder="1234" maxlength="4" id="smsCode">
              </div>
              <button class="btn" onclick="verifyCode()">Verify & Pay</button>
              <button class="btn btn-secondary" onclick="goBackToStep2()" style="margin-top: 12px;">Back</button>
            </div>

            <!-- Step 4: Success -->
            <div class="step" id="step4">
              <div class="success-animation">
                <div class="success-checkmark">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div class="success-title">Payment Successful!</div>
                <div class="success-desc">Redirecting to bot...</div>
              </div>
            </div>
          </div>

          <script>
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.MainButton.hide();

            const subscriptionId = '${subscriptionId}';
            const amount = ${subscription.price};
            const smsCode = '1234'; // Demo fixed code

            // Format card number
            document.getElementById('cardNumber').addEventListener('input', function(e) {
              let value = e.target.value.replace(/\\D/g, '');
              value = value.replace(/(.{4})/g, '$1 ').trim();
              e.target.value = value.slice(0, 19);
            });

            // Format expiry
            document.getElementById('expiry').addEventListener('input', function(e) {
              let value = e.target.value.replace(/\\D/g, '');
              if (value.length >= 2) {
                value = value.slice(0,2) + '/' + value.slice(2,4);
              }
              e.target.value = value;
            });

            // SMS code auto-format
            document.getElementById('smsCode').addEventListener('input', function(e) {
              e.target.value = e.target.value.replace(/\\D/g, '').slice(0, 4);
            });

            function showError(step, message) {
              document.getElementById('error' + step).textContent = message;
              document.getElementById('error' + step).style.display = 'block';
            }

            function hideError(step) {
              document.getElementById('error' + step).style.display = 'none';
            }

            function goToStep(step) {
              document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
              document.getElementById('step' + step).classList.add('active');
            }

            function goToStep2() {
              const cardNumber = document.getElementById('cardNumber').value;
              const expiry = document.getElementById('expiry').value;
              const cvv = document.getElementById('cvv').value;

              if (cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3) {
                showError(1, 'Please fill in all fields correctly');
                return;
              }

              hideError(1);
              goToStep(2);
            }

            function goBackToStep1() {
              goToStep(1);
            }

            function sendSMS() {
              const phone = document.getElementById('phone').value;
              if (phone.length < 10) {
                showError(2, 'Please enter a valid phone number');
                return;
              }

              // Demo: fixed code 1234
              console.log('[SMS] Code for ' + phone + ': 1234');
              tg.showAlert('Demo Mode: Your SMS code is 1234');

              hideError(2);
              goToStep(3);
            }

            function goBackToStep2() {
              goToStep(2);
            }

            function verifyCode() {
              const code = document.getElementById('smsCode').value;
              
              if (code.length !== 4) {
                showError(3, 'Please enter the 4-digit code');
                return;
              }

              if (code !== smsCode) {
                showError(3, 'Invalid code. Please try again.');
                return;
              }

              hideError(3);
              processPayment();
            }

            async function processPayment() {
              goToStep(4);

              try {
                const res = await fetch('/gateway/process', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscriptionId })
                });

                if (res.ok) {
                  // Wait 2.5 seconds then close/redirect
                  setTimeout(() => {
                    if (tg && tg.close) {
                      tg.close();
                    } else {
                      window.location.href = 'https://t.me/EasyPaywallBot';
                    }
                  }, 2500);
                } else {
                  tg.showAlert('Payment processing error. Please contact support.');
                }
              } catch (err) {
                tg.showAlert('Error: ' + err.message);
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

console.log(`\\n🚀 TMA Simulator: http://${HOST}:${PORT}/tma`);
console.log(`📡 Bot Webhook: ${BOT_WEBHOOK_URL}\\n`);
