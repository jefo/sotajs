const PORT = process.env.PAYMENT_PORT || 3000;
const HOST = process.env.PAYMENT_HOST || "lvh.me";
// Куда слать вебхук об успешной оплате (обычно это URL нашего бэкенда)
const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || `http://lvh.me:4000/webhook/payment`;
const SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || "demo_secret_123";

function signPayload(subId: string): string {
  return Buffer.from(`${subId}:${SIGNING_SECRET}`).toString("base64");
}

/**
 * Demo Payment Gateway (Web Application)
 * Имитирует работу Stripe / ЮKassa для демонстрации и разработки.
 */
Bun.serve({
  port: Number(PORT),
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Страница оплаты: /pay/:subscriptionId?amount=100&currency=RUB
    if (url.pathname.startsWith("/pay/")) {
      const subId = url.pathname.split("/")[2];
      const amount = url.searchParams.get("amount");
      const currency = url.searchParams.get("currency");
      const providerRaw = url.searchParams.get("provider") || "demo";
      
      const providers: Record<string, string> = {
        yookassa: "ЮKassa (Simulation)",
        stripe: "Stripe Checkout (Simulation)",
        robokassa: "Robokassa (Simulation)",
        prodamus: "Prodamus (Simulation)",
        demo: "Demo Gateway"
      };
      
      const providerName = providers[providerRaw] || providers.demo;

      return new Response(
        `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SotaJS - ${providerName}</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f2f5; }
            .card { background: white; padding: 2rem; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 350px; width: 90%; transition: border 0.3s; }
            .logo { font-size: 3rem; margin-bottom: 1rem; }
            h1 { font-size: 1.5rem; color: #1c1e21; margin: 0; }
            .service { color: #606770; margin-bottom: 1.5rem; }
            .amount { font-size: 2.5rem; font-weight: 800; color: #007bff; margin: 1rem 0; }
            .sub-id { font-size: 0.7rem; color: #bec3c9; margin-bottom: 2rem; word-break: break-all; }
            button { background: #28a745; color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-size: 1.1rem; font-weight: 600; cursor: pointer; width: 100%; transition: transform 0.1s, background 0.2s; }
            button:active { transform: scale(0.98); }
            button:hover { background: #218838; }
            .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #8d949e; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">💎</div>
            <h1>Безопасная оплата</h1>
            <div class="service">${providerName}</div>
            <div class="amount">${amount || ""} ${currency || ""}</div>
            <div class="sub-id">ID: ${subId}</div>
            <button onclick="pay()">Оплатить сейчас</button>
            <div class="footer">Это демонстрационная платежная система.<br>Реальные средства не списываются.</div>
          </div>
          <script>
            async function pay() {
              const btn = document.querySelector('button');
              const card = document.querySelector('.card');
              btn.disabled = true;
              btn.innerText = 'Проверка транзакции...';
              
              try {
                await new Promise(resolve => setTimeout(resolve, 800));

                const res = await fetch('/gateway/process', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscriptionId: '${subId}' })
                });
                
                if (res.ok) {
                  btn.style.background = '#007bff';
                  btn.innerText = '✅ Оплачено';
                  card.style.border = '2px solid #28a745';
                  setTimeout(() => {
                    alert('Инвестиция подтверждена! Возвращайтесь в Telegram для завершения онбординга.');
                  }, 200);
                } else {
                  throw new Error('Gateway error');
                }
              } catch (e) {
                btn.style.background = '#dc3545';
                btn.innerText = '❌ Ошибка шлюза';
                btn.disabled = false;
                setTimeout(() => {
                  alert('Произошла техническая ошибка на стороне шлюза. Попробуйте еще раз.');
                  btn.innerText = 'Повторить оплату';
                  btn.style.background = '#28a745';
                }, 500);
              }
            }
          </script>
        </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // 2. Внутренний эндпоинт "Шлюза", который имитирует отправку вебхука на сервер бота
    if (url.pathname === "/gateway/process" && req.method === "POST") {
      try {
        const { subscriptionId } = await req.json();
        const signature = signPayload(subscriptionId);
        
        console.log(`[GATEWAY] 💰 User paid. Sending signed webhook...`);
        
        const response = await fetch(BOT_WEBHOOK_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Signature": signature 
          },
          body: JSON.stringify({ subscriptionId })
        });
        
        if (response.ok) {
          console.log(`[GATEWAY] ✅ Webhook successfully delivered to bot.`);
          return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
        } else {
          console.error(`[GATEWAY] ❌ Webhook delivery failed: ${response.status}`);
          return new Response("Webhook delivery failed", { status: 500 });
        }
      } catch (e: any) {
        console.error(`[GATEWAY] ❌ Processing error: ${e.message}`);
        return new Response(e.message, { status: 400 });
      }
    }

    return new Response("Demo Payment Server Running", { status: 200 });
  }
});

console.log(`\n🚀 Demo Payment Gateway App: http://${HOST}:${PORT}`);
console.log(`📡 Bot Webhook Configured: ${BOT_WEBHOOK_URL}\n`);
