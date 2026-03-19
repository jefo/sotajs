import { FeaturePorts } from "../../../../lib";
import { PaymentFeature } from "../../application/features/payment.feature";
import { createHmac } from "crypto";

export class ProdamusPaymentAdapter implements FeaturePorts<typeof PaymentFeature> {
  private shopId: string; // Напр. "myshop" из myshop.payform.ru
  private secret: string;

  constructor(shopId: string, secret: string) {
    this.shopId = shopId;
    this.secret = secret;
  }

  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    console.log(`[PRODAMUS] Creating payment for sub: ${input.subscriptionId}`);

    // Prodamus требует специфический набор полей для формирования ссылки
    const params: any = {
      do: "pay",
      out_sum: input.amount.toFixed(2),
      order_id: input.subscriptionId,
      products: [
        {
          name: `Доступ в Product Accelerator`,
          sku: "sub_access",
          price: input.amount.toFixed(2),
          quantity: 1
        }
      ],
      // Кастомное поле для вебхука
      sys: "sotajs_paywall",
      subscriptionId: input.subscriptionId
    };

    // В реальности здесь формируется ссылка на форму оплаты
    // Для демо мы просто генерируем URL. Prodamus часто использует GET-параметры.
    const query = new URLSearchParams({
      ...params,
      // Тут могла бы быть подпись, если бы мы слали POST, 
      // но чаще используется редирект на https://shop.payform.ru/...
    });

    return {
      paymentUrl: `https://${this.shopId}.payform.ru?${query.toString()}`,
      externalId: input.subscriptionId,
    };
  }
}
