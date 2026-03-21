import "./paywall.composition";
import { confirmPaymentCommand } from "./application";

/**
 * Cloud Function Entry Point for Payments
 * 
 * Обрабатывает вебхуки от Stripe, ЮKassa и других систем.
 */
export const handler = async (req: Request) => {
  const SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || "demo_secret_123";

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any;
    
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    }

    console.log(`[PAYMENT-HANDLER] 🔔 Received webhook:`, JSON.stringify(body, null, 2));

    let subscriptionId: string | undefined;

    // Логика определения формата (аналогично index.ts)
    if (body.event === "payment.succeeded") {
      subscriptionId = body.object?.metadata?.subscriptionId;
    } else if (body.type === "checkout.session.completed") {
      subscriptionId = body.data?.object?.client_reference_id || body.data?.object?.metadata?.subscriptionId;
    } else if (body.shp_subscriptionId) {
      subscriptionId = body.shp_subscriptionId;
    } else if (body.subscriptionId) {
      subscriptionId = body.subscriptionId;
    } else {
      // Проверка подписи для демо-платежки
      const signature = req.headers.get("X-Signature");
      const expected = Buffer.from(`${body.subscriptionId}:${SIGNING_SECRET}`).toString("base64");
      if (signature === expected) {
        subscriptionId = body.subscriptionId;
      }
    }

    if (!subscriptionId) {
      return new Response("Invalid payload", { status: 400 });
    }

    await confirmPaymentCommand({
      subscriptionId,
      externalPaymentId: body.object?.id || body.InvId || `webhook_${Date.now()}`
    });

    return new Response(JSON.stringify({ ok: true }), { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    console.error(`[PAYMENT-HANDLER] ❌ Error: ${e.message}`);
    return new Response(e.message, { status: 400 });
  }
};
