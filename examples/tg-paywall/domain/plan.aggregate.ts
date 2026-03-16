import { z } from "zod";
import { createAggregate } from "../../../lib";

/**
 * Aggregate: Тарифный план (Plan)
 */

const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().length(3),
  durationDays: z.number().positive(),
  channelId: z.string().min(1), // NEW: Telegram channel ID ( @username или -100...)
  createdAt: z.date(),
  updatedAt: z.date(),
});

type PlanProps = z.infer<typeof PlanSchema>;

export const Plan = createAggregate({
  name: "Plan",
  schema: PlanSchema,
  invariants: [
    (props) => {
      if (props.price <= 0) throw new Error("Price must be positive");
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
