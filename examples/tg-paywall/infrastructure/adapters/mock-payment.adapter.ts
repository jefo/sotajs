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

		// Используем lvh.me (указывает на 127.0.0.1), так как Telegram не разрешает localhost в кнопках
		const host = process.env.PAYMENT_HOST || "lvh.me";
		const port = process.env.PAYMENT_PORT || 3000;
		return {
			paymentUrl: `http://${host}:${port}/pay/${input.subscriptionId}?amount=${input.amount}&currency=${input.currency}`,
			externalId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
		};
	}
}
