import { defineFeature } from "../../../../lib";
import { getTemplatePort, saveTemplatePort, deleteTemplatePort } from "../ports/paywall.ports";

export const MessagingFeature = defineFeature({
	getTemplate: getTemplatePort,
	saveTemplate: saveTemplatePort,
	deleteTemplate: deleteTemplatePort,
});
