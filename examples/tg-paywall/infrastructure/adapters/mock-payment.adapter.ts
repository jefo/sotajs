import { FeaturePorts } from "../../../../lib";
import { PaymentFeature } from "../../application/features/payment.feature";

export class MockPaymentAdapter implements FeaturePorts<typeof PaymentFeature> {
	async paymentProvider(input: {
		subscriptionId: string;
		amount: number;
		currency: string;
	}): Promise<{ paymentUrl: string; externalId: string }> {
		// Фиктивная платежка для fixture-driven development
		console.log(
			`[MOCK PAYMENT] Creating payment for subscription ${input.subscriptionId}`,
		);
		console.log(`[MOCK PAYMENT] Amount: ${input.amount} ${input.currency}`);

		// В демо-режиме возвращаем ссылку, которая имитирует платежную страницу
		// В реальном приложении здесь была бы ссылка на Stripe, ЮKassa и т.д.
		return {
			paymentUrl: `https://demo-payment.sotajs.dev/pay/${input.subscriptionId}?amount=${input.amount}&currency=${input.currency}`,
			externalId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
		};
	}
}
