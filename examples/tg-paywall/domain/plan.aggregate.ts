import { z } from "zod";
import { createAggregate } from "../../../lib";

/**
 * Aggregate: Тарифный план (Plan)
 */

const PlanSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
  group: z.string().default("standard"), // Напр. "career_accelerator"
  accessLevel: z.enum(["resident", "legend"]),
	price: z.number().nonnegative(),
	currency: z.string().length(3),
	durationDays: z.number().positive(),
  trialDays: z.number().default(0),
  isRecurring: z.boolean().default(false),
	channelId: z.string().min(1),
	createdAt: z.date(),
	updatedAt: z.date(),
});

type PlanProps = z.infer<typeof PlanSchema>;

export const Plan = createAggregate({
	name: "Plan",
	schema: PlanSchema,
	invariants: [
		(props) => {
			if (props.price < 0) throw new Error("Price cannot be negative");
			if (props.durationDays <= 0) throw new Error("Duration must be positive");
		},
	],
	actions: {
		updatePrice: (state, newPrice: number) => {
			if (newPrice <= 0) throw new Error("New price must be positive");
			state.price = newPrice;
			state.updatedAt = new Date();
		},
	},
});

export type Plan = ReturnType<typeof Plan.create>;
