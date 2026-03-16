import { z } from "zod";
import { usePorts } from "../../../../lib";
import { Plan } from "../../domain/plan.aggregate";
import { savePlanPort, loggerPort } from "../ports/paywall.ports";

const CreatePlanInputSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().length(3),
  durationDays: z.number().positive(),
  channelId: z.string().min(1), // Updated
});

type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;

export const createPlanCommand = async (input: CreatePlanInput) => {
  const data = CreatePlanInputSchema.parse(input);
  
  const ports = usePorts({ savePlan: savePlanPort, logger: loggerPort });

  const plan = Plan.create({
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await ports.savePlan({ plan: plan.props });

  await ports.logger({
    level: "info",
    message: `New plan created: ${plan.props.name}`,
    context: { planId: plan.id, channelId: plan.props.channelId },
  });

  return {
    planId: plan.id,
  };
};
