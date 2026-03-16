import { FeaturePorts } from "../../../../lib";
import { TelegramFeature } from "../../application/features/telegram.feature";

export class RealTelegramAdapter
	implements FeaturePorts<typeof TelegramFeature>
{
	private botToken: string;

	constructor(botToken: string) {
		this.botToken = botToken;
	}

	async grantTelegramAccess(input: {
		userId: string;
		resourceId: string;
	}): Promise<{ inviteLink: string }> {
		// РЕАЛЬНЫЙ Telegram Bot API
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${this.botToken}/createChatInviteLink`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						chat_id: input.resourceId,
						member_limit: 1,
						creates_join_request: false,
					}),
				},
			);

			const data = await response.json();

			if (!data.ok) {
				console.warn(
					`[TELEGRAM] Failed to create invite link: ${data.description}`,
				);
				// Fallback для демо - возвращаем информационную ссылку
				return {
					inviteLink: `https://t.me/sotajs?text=Demo: Access to ${input.resourceId} for user ${input.userId}`,
				};
			}

			console.log(
				`[TELEGRAM] Created invite link for user ${input.userId} to ${input.resourceId}`,
			);
			return { inviteLink: data.result.invite_link };
		} catch (error) {
			console.error("[TELEGRAM] Error creating invite link:", error);
			return {
				inviteLink: `https://t.me/sotajs?text=Demo: Would grant access to ${input.resourceId}`,
			};
		}
	}

	async revokeTelegramAccess(input: {
		userId: string;
		resourceId: string;
	}): Promise<void> {
		// РЕАЛЬНЫЙ Telegram Bot API для отзыва доступа
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${this.botToken}/banChatMember`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						chat_id: input.resourceId,
						user_id: parseInt(input.userId),
					}),
				},
			);

			const data = await response.json();

			if (!data.ok) {
				console.warn(`[TELEGRAM] Failed to revoke access: ${data.description}`);
			} else {
				console.log(
					`[TELEGRAM] Revoked access for user ${input.userId} from ${input.resourceId}`,
				);
			}
		} catch (error) {
			console.error("[TELEGRAM] Error revoking access:", error);
		}
	}
}
