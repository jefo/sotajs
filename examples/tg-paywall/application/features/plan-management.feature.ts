import { defineFeature } from "../../../../lib";
import {
	savePlanPort,
	findPlanByIdPort,
	findPlanByNamePort,
	listPlansPort,
} from "../ports/paywall.ports";

export const PlanManagementFeature = defineFeature({
	savePlan: savePlanPort,
	findPlanById: findPlanByIdPort,
	findPlanByName: findPlanByNamePort,
	listPlans: listPlansPort,
});
