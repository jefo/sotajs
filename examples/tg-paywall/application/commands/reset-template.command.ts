import { z } from "zod";
import { usePort } from "../../../../lib";
import { updateTemplatePort } from "../ports/paywall.ports";

/**
 * Command: Reset template to default
 */

const ResetTemplateInputSchema = z.object({
  key: z.string(),
});

type ResetTemplateInput = z.infer<typeof ResetTemplateInputSchema>;

type ResetTemplateResult =
  | { success: true; message: string }
  | { success: false; error: string };

export const resetTemplateCommand = async (
  input: ResetTemplateInput
): Promise<ResetTemplateResult> => {
  const command = ResetTemplateInputSchema.parse(input);

  const updateTemplate = usePort(updateTemplatePort);

  // Default templates
  const defaultTemplates: Record<string, string> = {
    payment_confirmed: `✅ <b>Оплата подтверждена!</b>\n\nВаш доступ к сообществу активирован.\n⏳ Период участия: {{durationDays}} дней.`,
    join_success: `🎉 <b>Добро пожаловать в Product Accelerator!</b>\n\nВаш доступ активирован на {{durationDays}} дней.\n\nДелитесь кейсами, задавайте вопросы, нетворкайте!`,
    join_declined: `❌ <b>Доступ отклонён</b>\n\nК сожалению, ваша подписка неактивна или истекла.\n\nДля получения доступа оформите участие в Product Accelerator.`,
  };

  const defaultContent = defaultTemplates[command.key];

  if (!defaultContent) {
    return {
      success: false,
      error: `Template "${command.key}" not found`,
    };
  }

  try {
    await updateTemplate({
      key: command.key,
      content: defaultContent,
    });

    return {
      success: true,
      message: `Template "${command.key}" reset to default`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export type { ResetTemplateInput, ResetTemplateResult };
