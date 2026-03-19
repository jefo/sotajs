import { FeaturePorts } from "../../../../lib";
import { PaymentFeature } from "../../application/features/payment.feature";

export class TelegramNativePaymentAdapter implements FeaturePorts<typeof PaymentFeature> {
  private botToken: string;
  private providerToken: string; // Пусто для Telegram Stars

  constructor(botToken: string, providerToken: string = "") {
    this.botToken = botToken;
    this.providerToken = providerToken;
  }

  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    console.log(`[TG-NATIVE] Creating invoice link for sub: ${input.subscriptionId}`);

    // Если валюта XTR (Stars), провайдер токен не нужен
    const isStars = input.currency === "XTR";

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Product Accelerator Access",
        description: `Full access for ${input.subscriptionId}`,
        payload: input.subscriptionId,
        provider_token: isStars ? "" : this.providerToken,
        currency: input.currency,
        prices: [
          { label: "Access", amount: Math.round(input.amount * 100) } // В минимальных единицах
        ]
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram Invoice Error: ${data.description}`);
    }

    return {
      paymentUrl: data.result, // Это специальная ссылка вида https://t.me/invoice/...
      externalId: input.subscriptionId
    };
  }
}
