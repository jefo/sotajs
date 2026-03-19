/**
 * Network Interceptor для Fixture-Driven Development.
 * Перехватывает вызовы к реальным API платежек и возвращает заготовленные ответы.
 * Это позволяет тестировать реальные адаптеры без создания аккаунтов.
 */

const originalFetch = globalThis.fetch;

export function setupNetworkInterceptor() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);

    // 1. Перехват ЮKassa
    if (url.includes("api.yookassa.ru/v3/payments")) {
      const body = JSON.parse(init?.body as string);
      const subId = body.metadata.subscriptionId;
      console.log(`[SIMULATOR] 🛡 Intercepted YooKassa request for sub: ${subId}`);
      
      return new Response(JSON.stringify({
        id: `yoo_${crypto.randomUUID().substring(0, 8)}`,
        status: "pending",
        amount: body.amount,
        confirmation: {
          type: "redirect",
          confirmation_url: `http://lvh.me:3000/pay/${subId}?provider=yookassa`
        }
      }), { status: 200 });
    }

    // 2. Перехват Stripe
    if (url.includes("api.stripe.com/v1/checkout/sessions")) {
      const params = new URLSearchParams(init?.body as string);
      const subId = params.get("metadata[subscriptionId]");
      console.log(`[SIMULATOR] 🛡 Intercepted Stripe request for sub: ${subId}`);

      return new Response(JSON.stringify({
        id: `cs_test_${crypto.randomUUID().substring(0, 8)}`,
        url: `http://lvh.me:3000/pay/${subId}?provider=stripe`
      }), { status: 200 });
    }

    // Все остальные запросы (например, к Telegram API) пропускаем как есть
    return originalFetch(input, init);
  };

  console.log("🚀 Network Interceptor active: Real payment APIs are now simulated.");
}
