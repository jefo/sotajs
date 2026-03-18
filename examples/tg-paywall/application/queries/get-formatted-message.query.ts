import { usePorts } from "../../../../lib";
import { getTemplatePort } from "../ports/paywall.ports";

export const DEFAULT_TEMPLATES = {
  // После подтверждения оплаты
  payment_confirmed: "🎉 <b>Инвестиция в ваш карьерный рост подтверждена!</b>\n\nВы стали частью закрытого сообщества Product Accelerator. Остался последний шаг: нажмите на кнопку ниже, чтобы отправить заявку на вступление. <b>Система онбординга одобрит её автоматически в течение секунды.</b>\n\nВаш доступ активен до: {{expiresAt}}",
  
  // После успешного вступления
  join_success: "🚀 <b>Добро пожаловать в Product Accelerator!</b>\n\nПоздравляем с правильным выбором. Вы присоединились к сообществу Senior-экспертов и амбициозных менеджеров.\n\n<b>С чего начать?</b>\n1. Изучите закрепленный пост с дорожной картой сообщества.\n2. Представьтесь в чате (ссылка в закрепе).\n3. Ознакомьтесь с графиком ближайших Q&A сессий.\n\nВаше участие подтверждено на {{durationDays}} дней. Начинаем трансформацию вашей карьеры!",
  
  // При отклонении (нет оплаты)
  join_declined: "❌ <b>Доступ в Акселератор ограничен.</b>\n\nК сожалению, мы не нашли подтвержденной оплаты для вашего аккаунта. Оформить участие и получить доступ к экспертизе BigTech можно в главном меню бота.",
};

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

/**
 * Query: Получить отформатированное сообщение по ключу шаблона
 */
export const getFormattedMessageQuery = async (
  key: TemplateKey, 
  data: Record<string, string | number> = {}
): Promise<string> => {
  const { getTemplate } = usePorts({ getTemplate: getTemplatePort });
  
  const customTemplate = await getTemplate({ key });
  let content = customTemplate?.content || DEFAULT_TEMPLATES[key];

  // Простая замена плейсхолдеров {{key}}
  for (const [k, v] of Object.entries(data)) {
    content = content.replace(new RegExp(`{{${k}}}`, "g"), String(v));
  }

  return content;
};
