import { defineFeature } from "../../../../lib";
import { paymentProviderPort } from "../ports/paywall.ports";

export const PaymentFeature = defineFeature({
	paymentProvider: paymentProviderPort,
});
