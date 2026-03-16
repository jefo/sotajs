import { defineFeature } from "../../../../lib";
import {
	savePlanPort,
	findPlanByIdPort,
	listPlansPort,
} from "../ports/paywall.ports";

export const PlanManagementFeature = defineFeature({
	savePlan: savePlanPort,
	findPlanById: findPlanByIdPort,
	listPlans: listPlansPort,
});
