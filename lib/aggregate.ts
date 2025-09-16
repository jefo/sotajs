import { z } from 'zod';
import { produce } from 'immer';

// A generic type for any domain event
interface IDomainEvent {
	aggregateId: string;
	timestamp: Date;
}

// WeakMaps to store internal state
const aggregateProps = new WeakMap<any, any>();
const aggregateEvents = new WeakMap<any, any[]>();

// --- Types for Hydration & Configuration ---

type EntityClass = { new (...args: any[]): any; create(data: any): any };
type EntitiesMap<TProps> = {
	[K in keyof TProps]?: EntityClass;
};

type HydratedState<TProps, TEntities> = {
	[K in keyof TProps]: K extends keyof TEntities
		? TEntities[K] extends EntityClass
			? InstanceType<TEntities[K]>
			: TProps[K]
		: TProps[K];
};

export interface AggregateConfig<TProps, TEntities, TActions, TComputed> {
	name: string;
	schema: z.ZodType<TProps>;
	invariants: Array<(state: HydratedState<TProps, TEntities>) => void>;
	actions: TActions;
	computed?: TComputed;
	entities?: TEntities;
}

type ComputedGetters<TComputed> = TComputed extends Record<string, any>
	? { [K in keyof TComputed]: TComputed[K] extends (state: any) => infer R ? R : never }
	: {};

/**
 * A factory function that creates a robust, behavior-rich Aggregate class.
 * @param config - The declarative configuration for the aggregate.
 * @returns A class representing the configured Aggregate.
 */
export function createAggregate<const TConfig extends AggregateConfig<any, any, any, any>>(
	config: TConfig,
) {
	type TProps = z.infer<TConfig['schema']>;
	type TEntities = TConfig['entities'];
	type TActions = TConfig['actions'];
	type TComputed = TConfig['computed'];

	const Aggregate = class {
		private constructor(props: HydratedState<TProps, TEntities>) {
			aggregateProps.set(this, props);
			aggregateEvents.set(this, []);
		}

		public static create(data: unknown) {
			const props = config.schema.parse(data) as TProps;

			const hydratedProps = { ...props } as HydratedState<TProps, TEntities>;
			if (config.entities) {
				for (const key in config.entities) {
					if (Object.prototype.hasOwnProperty.call(props, key)) {
						const EntityClass = config.entities[key as keyof TEntities];
						if (EntityClass && props[key]) {
							hydratedProps[key as keyof TProps] = EntityClass.create(
								props[key],
							);
						}
					}
				}
			}

			for (const invariant of config.invariants) {
				invariant(hydratedProps);
			}

			return new Aggregate(hydratedProps);
		}

		public get id(): string {
			return aggregateProps.get(this).id;
		}

		public get state(): Readonly<TProps> {
			const hydratedState = aggregateProps.get(this);
			const dehydratedState: any = { ...hydratedState };

			if (config.entities) {
				for (const key in config.entities) {
					if (
						Object.prototype.hasOwnProperty.call(hydratedState, key) &&
						hydratedState[key] &&
						typeof hydratedState[key].state !== 'undefined'
					) {
						dehydratedState[key] = hydratedState[key].state;
					}
				}
			}

			return Object.freeze(dehydratedState);
		}

		public getPendingEvents(): IDomainEvent[] {
			const events = [...(aggregateEvents.get(this) || [])];
			aggregateEvents.set(this, []);
			return events;
		}

		public clearEvents(): void {
			aggregateEvents.set(this, []);
		}

		public get actions(): {
			[K in keyof TActions]: (
				...args: TActions[K] extends (
					state: any,
					...args: infer P
				) => any
					? P
					: never
			) => void;
		} {
			const actionMethods: any = {};

			for (const [actionName, actionFn] of Object.entries(config.actions)) {
				actionMethods[actionName] = (...args: any[]) => {
					const currentState = aggregateProps.get(this);

					const nextState = produce(
						currentState,
						(draft: HydratedState<TProps, TEntities>) => {
							const result = (actionFn as any)(draft, ...args);

							if (result && result.event) {
								const events = aggregateEvents.get(this) || [];
								events.push(result.event);
								aggregateEvents.set(this, events);
							}
						},
					);

					for (const invariant of config.invariants) {
						invariant(nextState);
					}

					aggregateProps.set(this, nextState);
				};
			}

			return actionMethods;
		}
	};

	if (config.computed) {
		for (const key in config.computed) {
			if (Object.prototype.hasOwnProperty.call(config.computed, key)) {
				Object.defineProperty(Aggregate.prototype, key, {
					get: function () {
						const state = aggregateProps.get(this);
						return (config.computed as TComputed)[key](state);
					},
					enumerable: true,
				});
			}
		}
	}

	type AggregateInstance = ReturnType<(typeof Aggregate)['create']> &
		ComputedGetters<TComputed>;

	return Aggregate as {
		new (...args: any[]): AggregateInstance;
		create(data: unknown): AggregateInstance;
	};
}