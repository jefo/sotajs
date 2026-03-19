import { FeaturePorts } from "../../../../lib";
import { PaymentFeature } from "../../application/features/payment.feature";
import { createHash } from "crypto";

export class RobokassaPaymentAdapter implements FeaturePorts<typeof PaymentFeature> {
  private login: string;
  private pass1: string;
  private isTest: boolean;

  constructor(login: string, pass1: string, isTest = true) {
    this.login = login;
    this.pass1 = pass1;
    this.isTest = isTest;
  }

  async paymentProvider(input: {
    subscriptionId: string;
    amount: number;
    currency: string;
  }): Promise<{ paymentUrl: string; externalId: string }> {
    console.log(`[ROBOKASSA] Creating payment for sub: ${input.subscriptionId}`);

    const invId = Math.floor(Date.now() / 1000); // Robokassa требует числовой ID инвойса
    const outSum = input.amount.toFixed(2);
    
    // Формируем подпись: Login:OutSum:InvId:Pass1:shp_subscriptionId=...
    const signatureValue = createHash("md5")
      .update(`${this.login}:${outSum}:${invId}:${this.pass1}:shp_subscriptionId=${input.subscriptionId}`)
      .digest("hex");

    const params = new URLSearchParams({
      MerchantLogin: this.login,
      OutSum: outSum,
      InvId: invId.toString(),
      Description: `Product Accelerator: ${input.subscriptionId}`,
      SignatureValue: signatureValue,
      IsTest: this.isTest ? "1" : "0",
      shp_subscriptionId: input.subscriptionId, // Кастомное поле для проброса subId
    });

    const baseUrl = process.env.MOCK_NETWORK === "true" 
      ? "http://lvh.me:3000/pay" 
      : "https://auth.robokassa.ru/Merchant/Index.aspx";

    // Для симуляции добавляем provider в параметры
    if (process.env.MOCK_NETWORK === "true") {
      params.append("provider", "robokassa");
    }

    return {
      paymentUrl: `${baseUrl}?${params.toString()}`,
      externalId: invId.toString(),
    };
  }
}
