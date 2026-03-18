import { z } from "zod";
import { createAggregate, IDomainEvent } from "../../../lib";

/**
 * Domain Events
 */

export class AccessGrantedEvent implements IDomainEvent {
	constructor(
		public readonly aggregateId: string,
		public readonly userId: string,
		public readonly resourceId: string,
		public readonly resourceType: string,
		public readonly timestamp: Date = new Date(),
	) {}
}

export class AccessRevokedEvent implements IDomainEvent {
	constructor(
		public readonly aggregateId: string,
		public readonly userId: string,
		public readonly resourceId: string,
		public readonly resourceType: string,
		public readonly timestamp: Date = new Date(),
	) {}
}

/**
 * Aggregate: Разрешение доступа (AccessGrant)
 */

const AccessGrantSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	resourceId: z.string(),
	resourceType: z.enum(["telegram_channel", "telegram_chat"]),
	status: z.enum(["active", "revoked"]),
	subscriptionId: z.string().uuid(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

type AccessGrantProps = z.infer<typeof AccessGrantSchema>;

export const AccessGrant = createAggregate({
	name: "AccessGrant",
	schema: AccessGrantSchema,
	invariants: [],
	actions: {
		revoke: (state) => {
			if (state.status === "revoked") {
				throw new Error("Access is already revoked");
			}
			state.status = "revoked";
			state.updatedAt = new Date();

			return {
				event: new AccessRevokedEvent(
					state.id,
					state.userId,
					state.resourceId,
					state.resourceType,
				),
			};
		},
	},
});

export type AccessGrant = ReturnType<typeof AccessGrant.create>;
