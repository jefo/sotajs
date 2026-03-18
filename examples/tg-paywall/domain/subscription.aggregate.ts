import { z } from "zod";
import { createAggregate, IDomainEvent } from "../../../lib";

/**
 * Domain Events
 */

export class SubscriptionActivatedEvent implements IDomainEvent {
	constructor(
		public readonly aggregateId: string,
		public readonly userId: string,
		public readonly expiresAt: Date,
		public readonly timestamp: Date = new Date(),
	) {}
}

export class SubscriptionExpiredEvent implements IDomainEvent {
	constructor(
		public readonly aggregateId: string,
		public readonly userId: string,
		public readonly timestamp: Date = new Date(),
	) {}
}

/**
 * Aggregate: Подписка (Subscription)
 */

const SubscriptionSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	planId: z.string().uuid(),
	status: z.enum(["pending", "active", "expired", "cancelled"]),
	expiresAt: z.date().optional(),
	price: z.number().positive(),
	currency: z.string().length(3),
	createdAt: z.date(),
	updatedAt: z.date(),
});

type SubscriptionProps = z.infer<typeof SubscriptionSchema>;

export const Subscription = createAggregate({
	name: "Subscription",
	schema: SubscriptionSchema,
	invariants: [
		(props) => {
			if (props.status === "active" && !props.expiresAt) {
				throw new Error("Active subscription must have an expiration date");
			}
		},
	], 
	actions: {
		activate: (state, durationDays: number) => {
			if (state.status !== "pending") {
				throw new Error(
					`Cannot activate subscription from state: ${state.status}`,
				);
			}

			const now = new Date();
			state.status = "active";
			state.expiresAt = new Date(
				now.getTime() + durationDays * 24 * 60 * 60 * 1000,
			);
			state.updatedAt = now;

			return {
				event: new SubscriptionActivatedEvent(
					state.id,
					state.userId,
					state.expiresAt,
				),
			};
		},

		expire: (state) => {
			if (state.status !== "active") {
				throw new Error(
					`Cannot expire subscription from state: ${state.status}`,
				);
			}

			state.status = "expired";
			state.updatedAt = new Date();

			return {
				event: new SubscriptionExpiredEvent(state.id, state.userId),
			};
		},

		cancel: (state) => {
			if (state.status === "cancelled" || state.status === "expired") {
				throw new Error("Subscription already inactive");
			}
			state.status = "cancelled";
			state.updatedAt = new Date();
		},
	},
	computed: {
		isActive: (props) => props.status === "active",
		isExpired: (props, now = new Date()) => {
			if (!props.expiresAt) return false;
			return props.status === "active" && now > props.expiresAt;
		},
	},
});

export type Subscription = ReturnType<typeof Subscription.create>;
