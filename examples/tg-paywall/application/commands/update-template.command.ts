import { z } from "zod";
import { usePorts } from "../../../../lib";
import { saveTemplatePort } from "../ports/paywall.ports";

const UpdateTemplateInputSchema = z.object({
  key: z.string(),
  content: z.string().min(1),
});

type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;

export const updateTemplateCommand = async (input: UpdateTemplateInput) => {
  const { key, content } = UpdateTemplateInputSchema.parse(input);
  const { saveTemplate } = usePorts({ saveTemplate: saveTemplatePort });

  await saveTemplate({ key, content });
  return { success: true };
};
