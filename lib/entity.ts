import { z } from 'zod';
import { deepFreeze } from './utils';

export interface EntityConfig<TProps extends { id: string }, TActions extends Record<string, any>> {
  schema: z.ZodType<TProps>;
  actions: TActions;
}

/**
 * A factory function that creates an Entity class.
 * Entities are objects with a distinct identity (ID) and a mutable state,
 * which can only be changed through defined actions.
 *
 * @param config - The configuration for the entity, including its schema and actions.
 * @returns A class for the Entity.
 */
export function createEntity<TProps extends { id: string }, TActions extends Record<string, (state: TProps, ...args: any[]) => TProps>>(
  config: EntityConfig<TProps, TActions>
) {
  return class Entity {
    // Use # prefix for truly private fields (ES2022)
    #props: TProps;

    private constructor(props: TProps) {
      this.#props = props;
    }

    /**
     * The only public way to create an instance of the Entity.
     * It validates the input data against the schema.
     * @param data - The raw data for creating the Entity.
     */
    public static create(data: unknown): Entity {
      const props = config.schema.parse(data);
      return new Entity(props);
    }

    /**
     * Provides access to a frozen copy of the entity's state.
     */
    public get state(): Readonly<TProps> {
      return deepFreeze({ ...this.#props });
    }

    /**
     * An object containing all the defined actions for this entity.
     */
    public get actions(): {
      [K in keyof TActions]: (
        ...args: TActions[K] extends (state: TProps, ...args: infer P) => any
          ? P
          : never
      ) => void;
    } {
      const actionMethods: any = {};

      for (const [actionName, actionFn] of Object.entries(config.actions)) {
        actionMethods[actionName] = (...args: any[]) => {
          const newState = actionFn(this.#props, ...args);
          this.#props = newState;
        };
      }

      return actionMethods;
    }
  };
}