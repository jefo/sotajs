import { z } from "zod";
import { produce } from "immer";

// A generic type for any domain event
export interface IDomainEvent {
	aggregateId: string;
	timestamp: Date;
}

// WeakMaps to store internal state
const aggregateProps = new WeakMap<any, any>();
const aggregateEvents = new WeakMap<any, any[]>();

// --- Types for Hydration & Configuration ---

type EntityClass = { create(data: any): any };
type EntitiesMap<TProps> = {
	[K in keyof TProps]?: EntityClass;
};

type HydratedProps<TProps, TEntities> = {
	[K in keyof TProps]: K extends keyof TEntities
		? TEntities[K] extends EntityClass
			? ReturnType<TEntities[K]["create"]>
			: TProps[K]
		: TProps[K];
};

// Re-introducing the exported interface
export interface AggregateConfig<
	TProps extends { id: string },
	TEntities extends EntitiesMap<TProps>,
	TActions extends Record<
		string,
		(props: HydratedProps<TProps, TEntities>, ...args: any[]) => any
	>,
	TComputed extends Record<
		string,
		(props: HydratedProps<TProps, TEntities>) => any
	>,
> {
	name: string;
	schema: z.ZodType<TProps>;
	entities?: TEntities;
	invariants: Array<(props: HydratedProps<TProps, TEntities>) => void>;
	actions: TActions;
	computed?: TComputed;
}

export type Actions<TState> = Record<string, (state: TState, ...args: any[]) => any>;

type OmitStateParameter<F> = F extends (state: any, ...args: infer A) => infer R
  ? (...args: A) => R
  : F;

export type PublicActions<T extends Actions<any>> = {
  [K in keyof T]: OmitStateParameter<T[K]>;
};

export type Aggregate<TState, TActions extends Actions<TState>> = {
  id: string;
  readonly state: TState;
  readonly actions: PublicActions<TActions>;
  getPendingEvents: () => any[];
}

type ComputedGetters<TComputed> = TComputed extends Record<string, any>
	? {
			[K in keyof TComputed]: TComputed[K] extends (props: any) => infer R
				? R
				: never;
		}
	: {};

/**
 * A factory function that creates a robust, behavior-rich Aggregate class.
 * @param config - The declarative configuration for the aggregate.
 * @returns A class representing the configured Aggregate.
 */
export function createAggregate<
	TProps extends { id: string },
	TEntities extends EntitiesMap<TProps>,
	TActions extends Record<
		string,
		(props: HydratedProps<TProps, TEntities>, ...args: any[]) => any
	>,
	TComputed extends Record<
		string,
		(props: HydratedProps<TProps, TEntities>) => any
	>,
>(config: AggregateConfig<TProps, TEntities, TActions, TComputed>) {
	const Aggregate = class {
		private constructor(props: HydratedProps<TProps, TEntities>) {
			aggregateProps.set(this, props);
			aggregateEvents.set(this, []);
		}

		public static create(data: unknown) {
			const props = config.schema.parse(data) as TProps;

			const hydratedProps = { ...props } as HydratedProps<TProps, TEntities>;
			if (config.entities) {
				const entityKeys = Object.keys(config.entities) as (keyof TEntities)[];
				for (const key of entityKeys) {
					const propKey = key as keyof TProps;
					if (Object.prototype.hasOwnProperty.call(props, propKey)) {
						const EntityClass = config.entities[key];
						const propValue = props[propKey];
						if (EntityClass && propValue) {
							(hydratedProps as any)[propKey] = EntityClass.create(propValue);
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

		public get props(): Readonly<TProps> {
			const hydratedProps = aggregateProps.get(this);
			const dehydratedProps: any = { ...hydratedProps };

			if (config.entities) {
				for (const key in config.entities) {
					if (
						Object.prototype.hasOwnProperty.call(hydratedProps, key) &&
						hydratedProps[key]
					) {
						if (typeof hydratedProps[key].props !== "undefined") {
							// Dehydrate Entity or Value Object
							dehydratedProps[key] = hydratedProps[key].props;
						} else if (typeof hydratedProps[key].state !== "undefined") {
							// Dehydrate Entity
							dehydratedProps[key] = hydratedProps[key].state;
						}
					}
				}
			}

			return Object.freeze(dehydratedProps);
		}

		/**
		 * @deprecated Use .props instead. Will be removed in a future version.
		 */
		public get state(): Readonly<TProps> {
			return this.props;
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
					props: HydratedProps<TProps, TEntities>,
					...args: infer P
				) => any
					? P
					: never
			) => void;
		} {
			const actionMethods: any = {};

			for (const [actionName, actionFn] of Object.entries(config.actions)) {
				actionMethods[actionName] = (...args: any[]) => {
					const currentProps = aggregateProps.get(this) as HydratedProps<
						TProps,
						TEntities
					>;

					const nextProps = produce(
						currentProps,
						(draft: HydratedProps<TProps, TEntities>) => {
							const result = (actionFn as any)(draft, ...args);

							if (result && result.event) {
								const events = aggregateEvents.get(this) || [];
								events.push(result.event);
								aggregateEvents.set(this, events);
							}
						},
					);

					for (const invariant of config.invariants) {
						invariant(nextProps);
					}

					aggregateProps.set(this, nextProps);
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
						const props = aggregateProps.get(this);
						return (config.computed as TComputed)[key](props);
					},
					enumerable: true,
				});
			}
		}
	}

	type AggregateInstance = ReturnType<(typeof Aggregate)["create"]> &
		ComputedGetters<TComputed>;

	return Aggregate as {
		new (...args: any[]): AggregateInstance;
		create(data: unknown): AggregateInstance;
	};
}
