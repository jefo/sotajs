import { z } from 'zod';
import { produce } from 'immer';
import { deepFreeze } from './utils';

// WeakMaps to store internal state
const entityProps = new WeakMap<any, any>();

// Type for computed properties
type ComputedGetters<TComputed> = TComputed extends Record<string, any>
  ? { [K in keyof TComputed]: TComputed[K] extends (props: any) => infer R ? R : never }
  : {};

// Type for auto-generated setters
export type PropertySetters<TProps extends { id: string }> = {
  [K in Exclude<keyof TProps, 'id'> as `set${Capitalize<string & K>}`]: (value: TProps[K]) => void;
};

export interface EntityConfig<
  TProps extends { id: string },
  TActions extends Record<string, any>,
  TComputed extends Record<string, (props: TProps) => any> = {}
> {
  schema: z.ZodType<TProps>;
  actions: TActions;
  computed?: TComputed;
  enableAutoSetters?: boolean; // Option to enable auto-generated setters
}

/**
 * Generates setter actions for each property in the schema (except id)
 */
function generateSetters<TProps extends { id: string }>(schema: z.ZodType<TProps>): Record<string, (props: TProps, value: any) => void> {
  const setters: Record<string, (props: TProps, value: any) => void> = {};
  
  // Handle different Zod object types
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    
    Object.entries(shape).forEach(([key, validator]) => {
      if (key !== 'id') { // Don't create setter for id as it shouldn't change
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        const setterName = `set${capitalizedKey}`;
        
        setters[setterName] = (draft: TProps, value: any) => {
          // Validate the value against the specific field's schema before setting
          const parsedValue = (validator as z.ZodType).parse(value);
          (draft as any)[key] = parsedValue;
        };
      }
    });
  }
  
  return setters;
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
  TComputed extends Record<string, (props: TProps) => any> = {},
  TEnableAutoSetters extends boolean = false
>(config: EntityConfig<TProps, TActions, TComputed> & { enableAutoSetters?: TEnableAutoSetters }) {
  // Generate automatic setters if enabled
  const autoSetters = config.enableAutoSetters ? generateSetters(config.schema) : {};
  
  // Merge custom actions with auto-generated setters
  const allActions = { ...config.actions, ...autoSetters } as Record<string, any>;
  
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
    public get actions(): { [K in keyof typeof allActions]: (...args: (typeof allActions)[K] extends (props: TProps, ...args: infer P) => any ? P : never) => void; } {
      const actionMethods: any = {};

      for (const [actionName, actionFn] of Object.entries(allActions)) {
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

      // Return type with computed properties and auto-setters
  type EntityInstance = Entity & 
    ComputedGetters<TComputed>;
  
  return Entity as unknown as {
    new (props: TProps): EntityInstance;
    create(data: unknown): EntityInstance;
  };
}
