import { z } from 'zod';
import { produce } from 'immer';
import { deepFreeze } from './utils';

// WeakMaps to store internal state
const entityProps = new WeakMap<any, any>();

// Type for computed properties
type ComputedGetters<TComputed> = TComputed extends Record<string, any>
  ? { [K in keyof TComputed]: TComputed[K] extends (props: any) => infer R ? R : never }
  : {};

export interface EntityConfig<
  TProps extends { id: string },
  TActions extends Record<string, any>,
  TComputed extends Record<string, (props: TProps) => any> = {}
> {
  schema: z.ZodType<TProps>;
  actions: TActions;
  computed?: TComputed;
}

/**
 * A factory function that creates an Entity class.
 * Entities are objects with a distinct identity (ID) and a mutable state,
 * which can only be changed through defined actions.
 *
 * @param config - The configuration for the entity, including its schema and actions.
 * @returns A class for the Entity.
 */
export function createEntity<
  TProps extends { id: string },
  TActions extends Record<string, (props: TProps, ...args: any[]) => void>,
  TComputed extends Record<string, (props: TProps) => any> = {}
>(config: EntityConfig<TProps, TActions, TComputed>) {
  class Entity {
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
     * Provides access to a frozen copy of the entity's properties.
     */
    public get props(): Readonly<TProps> {
      return deepFreeze({ ...entityProps.get(this) });
    }

    /**
     * @deprecated Use .props instead. Will be removed in a future version.
     */
    public get state(): Readonly<TProps> {
      return this.props;
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
        ...args: TActions[K] extends (props: TProps, ...args: infer P) => any
          ? P
          : never
      ) => void;
    } {
      const actionMethods: any = {};

      for (const [actionName, actionFn] of Object.entries(config.actions)) {
        actionMethods[actionName] = (...args: any[]) => {
          const currentProps = entityProps.get(this);
          const nextState = produce(currentProps, (draft: TProps) => {
            actionFn(draft, ...args);
          });
          entityProps.set(this, nextState);
        };
      }

      return actionMethods;
    }
  }

  // Add computed properties as getters on the prototype
  if (config.computed) {
    for (const key in config.computed) {
      if (Object.prototype.hasOwnProperty.call(config.computed, key)) {
        Object.defineProperty(Entity.prototype, key, {
          get: function () {
            const props = entityProps.get(this);
            return (config.computed as TComputed)[key](props);
          },
          enumerable: true,
        });
      }
    }
  }

  // Return type with computed properties
  type EntityInstance = Entity & ComputedGetters<TComputed>;
  
  return Entity as {
    new (props: TProps): EntityInstance;
    create(data: unknown): EntityInstance;
  };
}
