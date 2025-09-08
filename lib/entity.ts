import { z } from 'zod';
import { produce } from 'immer';
import { deepFreeze } from './utils';

// WeakMaps to store internal state
const entityProps = new WeakMap<any, any>();

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
export function createEntity<TProps extends { id: string }, TActions extends Record<string, (state: TProps, ...args: any[]) => void>>(
  config: EntityConfig<TProps, TActions>
) {
  return class Entity {
    private constructor(props: TProps) {
      entityProps.set(this, props);
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
     * Provides access to the entity's ID.
     */
    public get id(): string {
      return entityProps.get(this).id;
    }

    /**
     * Provides access to a frozen copy of the entity's state.
     */
    public get state(): Readonly<TProps> {
      return deepFreeze({ ...entityProps.get(this) });
    }

    /**
     * Checks for identity equality against another Entity.
     * @param other - The other Entity to compare with.
     */
    public equals(other?: Entity): boolean {
      if (other === null || other === undefined) {
        return false;
      }
      return entityProps.get(this).id === entityProps.get(other).id;
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
          const currentState = entityProps.get(this);
          const nextState = produce(currentState, (draft: TProps) => {
            actionFn(draft, ...args);
          });
          entityProps.set(this, nextState);
        };
      }

      return actionMethods;
    }
  };
}
