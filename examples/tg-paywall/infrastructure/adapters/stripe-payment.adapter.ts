import { FeaturePorts } from "../../../../lib";
import { PaymentFeature } from "../../application/features/payment.feature";

export class StripePaymentAdapter implements FeaturePorts<typeof PaymentFeature> {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    console.log(`[STRIPE] Creating Checkout Session for sub: ${input.subscriptionId}`);

    // Используем нативный fetch к Stripe API
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "mode": "payment",
        "line_items[0][price_data][currency]": input.currency.toLowerCase(),
        "line_items[0][price_data][product_data][name]": "Product Accelerator Access",
        "line_items[0][price_data][unit_amount]": (input.amount * 100).toString(), // Stripe в центах
        "line_items[0][quantity]": "1",
        "success_url": "https://t.me/your_bot_username",
        "client_reference_id": input.subscriptionId,
        "metadata[subscriptionId]": input.subscriptionId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Stripe Error: ${data.error?.message || "Unknown error"}`);
    }

    return {
      paymentUrl: data.url,
      externalId: data.id,
    };
  }
}
