import { z } from "zod";
import { produce } from "immer";
import { deepFreeze } from "./utils";

// WeakMap to store internal state
const valueObjectProps = new WeakMap<any, any>();

export interface ValueObjectConfig<
	TProps,
	TActions extends Record<string, (state: TProps, ...args: any[]) => void>,
> {
	schema: z.ZodType<TProps>;
	actions?: TActions;
}

/**
 * A factory function that creates a Value Object class.
 * Value Objects are defined by their attributes.
 *
 * @param config - The configuration for the value object, including its schema and actions.
 * @returns A class for the Value Object.
 */
export function createValueObject<
	TProps,
	TActions extends Record<string, (state: TProps, ...args: any[]) => void> = {},
>(config: ValueObjectConfig<TProps, TActions>) {
	type Props = z.infer<typeof config.schema>;

	const ValueObject = class ValueObject {
		private constructor(props: Props) {
			valueObjectProps.set(this, props);
		}

		/**
		 * The only public way to create an instance of the Value Object.
		 * It validates the input data against the schema.
		 * @param data - The raw data for creating the VO.
		 */
		public static create(data: unknown): ValueObject {
			const parsedData = config.schema.parse(data);
			return new ValueObject(parsedData);
		}

		/**
		 * Provides access to a frozen, read-only copy of the VO's properties.
		 */
		public get props(): Readonly<Props> {
			return deepFreeze({ ...valueObjectProps.get(this) });
		}

		/**
		 * Checks for structural equality against another Value Object.
		 * @param other - The other Value Object to compare with.
		 */
		public equals(other?: ValueObject | null): boolean {
			if (other === null || other === undefined) {
				return false;
			}
			// A simple but effective way to check for deep equality.
			return JSON.stringify(this.props) === JSON.stringify(other.props);
		}

		public get actions(): {
			[K in keyof TActions]: (
				...args: TActions[K] extends (state: Props, ...args: infer P) => any
					? P
					: never
			) => void; // Actions now return void
		} {
			const actionMethods: any = {};

			if (!config.actions) {
				return actionMethods;
			}

			for (const [actionName, actionFn] of Object.entries(config.actions)) {
				actionMethods[actionName] = (...args: any[]) => {
					const currentState = valueObjectProps.get(this);
					const nextState = produce(currentState, (draft: Props) => {
						(actionFn as any)(draft, ...args);
					});
					// Mutate the internal state
					valueObjectProps.set(this, nextState);
				};
			}

			return actionMethods;
		}
	};

	type ValueObjectInstance = ReturnType<typeof ValueObject.create>;

	return ValueObject as {
		new (props: Props): ValueObjectInstance;
		create(data: Props): ValueObjectInstance;
	};
}
