import { defineFeature } from "../../../../lib";
import { loggerPort } from "../ports/paywall.ports";

export const LoggingFeature = defineFeature({
	logger: loggerPort,
});
