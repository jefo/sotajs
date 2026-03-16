import { defineFeature } from "../../../../lib";
import {
	saveSubscriptionPort,
	updateSubscriptionPort,
	findSubscriptionByIdPort,
	findSubscriptionsByUserIdPort,
	listAllSubscriptionsPort,
	findExpiredSubscriptionsPort,
	saveAccessGrantPort,
	updateAccessGrantPort,
	findAccessGrantBySubscriptionIdPort,
} from "../ports/paywall.ports";

export const SubscriptionFeature = defineFeature({
	saveSubscription: saveSubscriptionPort,
	updateSubscription: updateSubscriptionPort,
	findSubscriptionById: findSubscriptionByIdPort,
	findSubscriptionsByUserId: findSubscriptionsByUserIdPort,
	listAllSubscriptions: listAllSubscriptionsPort,
	findExpiredSubscriptions: findExpiredSubscriptionsPort,
	saveAccessGrant: saveAccessGrantPort,
	updateAccessGrant: updateAccessGrantPort,
	findAccessGrantBySubscriptionId: findAccessGrantBySubscriptionIdPort,
});
