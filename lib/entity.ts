import { z } from 'zod';
import { deepFreeze } from './utils';

// The ID can be a string or any object with a `toString()` method.
// For comparison, it's best if it also has an `equals()` method.
type AnyId = { toString(): string };

export interface EntityConfig<TProps extends { id: AnyId }, TActions extends Record<string, any>> {
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
export function createEntity<TProps extends { id: AnyId }, TActions extends Record<string, (state: TProps, ...args: any[]) => TProps>>(
  config: EntityConfig<TProps, TActions>
) {
  return class Entity {
    private props: TProps;

    private constructor(props: TProps) {
      this.props = props;
    }

    /**
     * The only public way to create an instance of the Entity.
     * It validates the input data against the schema.
     * @param data - The raw data for creating the Entity.
     */
    public static create(data: unknown): Entity {
      const validatedProps = config.schema.parse(data);
      return new Entity(validatedProps);
    }

    /**
     * The unique identifier of the Entity, returned as a string.
     */
    get id(): string {
      return this.props.id.toString();
    }

    /**
     * Read-only access to the entity's current state.
     */
    get state(): Readonly<TProps> {
      return deepFreeze({ ...this.props }); // Ensure immutability of returned state
    }

    /**
     * Checks for identity equality against another Entity.
     * Entities are equal if they are of the same type and have the same ID.
     * @param other - The other Entity to compare with.
     */
    public equals(other?: any): boolean {
      if (other === null || other === undefined) {
        return false;
      }
      // Check if they are instances of the same Entity class
      if (this.constructor !== other.constructor) {
        return false;
      }

      const thisId = this.props.id as any;
      const otherId = other.props.id;

      // If the ID has an `equals` method, use it for comparison.
      if (typeof thisId === 'object' && thisId !== null && typeof thisId.equals === 'function') {
        return thisId.equals(otherId);
      }

      // Otherwise, fall back to strict equality on their string representation.
      return this.id === other.id;
    }

    /**
     * A proxy-like object that exposes the actions as callable methods.
     * This is the only way to modify the entity's state.
     */
    public readonly actions = Object.keys(config.actions).reduce((acc, actionName) => {
      acc[actionName as keyof TActions] = (...args: any[]) => {
        // Execute the action's pure function to get the new state.
        const action = config.actions[actionName];
        if (!action) return;
        const nextState = action(this.props, ...args);

        // Commit the new state.
        this.props = nextState;
      };
      return acc;
    }, {} as { [K in keyof TActions]: (...args: Parameters<TActions[K]>[1][]) => void });
  };
}
