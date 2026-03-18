import { FeaturePorts } from "../../../../lib";
import { PaymentFeature } from "../../application/features/payment.feature";

export class YookassaPaymentAdapter implements FeaturePorts<typeof PaymentFeature> {
  private shopId: string;
  private secretKey: string;

  constructor(shopId: string, secretKey: string) {
    this.shopId = shopId;
    this.secretKey = secretKey;
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString("base64")}`;
  }

  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    console.log(`[YOOKASSA] Creating real payment for sub: ${input.subscriptionId}`);

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.authHeader,
        "Idempotence-Key": input.subscriptionId, // Используем subId как ключ идемпотентности
      },
      body: JSON.stringify({
        amount: {
          value: input.amount.toFixed(2),
          currency: input.currency,
        },
        confirmation: {
          type: "redirect",
          return_url: `https://t.me/your_bot_username`, // Замените на юзернейм вашего бота
        },
        capture: true,
        description: `Оплата участия в Product Accelerator (Sub: ${input.subscriptionId})`,
        metadata: {
          subscriptionId: input.subscriptionId,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Yookassa Error: ${data.description || "Unknown error"}`);
    }

    return {
      paymentUrl: data.confirmation.confirmation_url,
      externalId: data.id,
    };
  }
}
