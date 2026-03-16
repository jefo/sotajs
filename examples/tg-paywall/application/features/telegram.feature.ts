import { defineFeature } from "../../../../lib";
import {
	grantTelegramAccessPort,
	revokeTelegramAccessPort,
} from "../ports/paywall.ports";

export const TelegramFeature = defineFeature({
	grantTelegramAccess: grantTelegramAccessPort,
	revokeTelegramAccess: revokeTelegramAccessPort,
});
