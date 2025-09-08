import { z, ZodType } from "zod";
import { createAggregate } from "./aggregate";

// A generic interface to represent an Aggregate instance, exposing state and id.
// This helps in creating generic functions that operate on any aggregate type.
export interface IAggregate {
  readonly id: string;
  readonly state: any;
  readonly actions: any;
}


// Define the configuration for the linker factory
interface RelationConfig<
	TEntityA extends IAggregate,
	TEntityB extends IAggregate,
> {
	name: string;
	schemaA: ZodType<TEntityA["state"]>;
	schemaB: ZodType<TEntityB["state"]>;
	link: (payload: { entityA: TEntityA; entityB: TEntityB }) => void;
}

/**
 * A factory function to create a transactional linker aggregate.
 * This standardizes the pattern of atomically updating two entities.
 */
export function createRelation<TEntityA extends IAggregate, TEntityB extends IAggregate>(
  config: RelationConfig<TEntityA, TEntityB>
) {
  const { name, schemaA, schemaB, link: linkFn } = config;

  return createAggregate({
    name,
    schema: z.object({ entityA: schemaA, entityB: schemaB }).optional(),
    invariants: [], // Relations typically don't have their own invariants
    actions: {
      link: (state, payload: { entityA: TEntityA; entityB: TEntityB }) => {
        const { entityA, entityB } = payload;

        // 1. Execute the user-defined linking logic which mutates the entities
        linkFn({ entityA, entityB });

        // 2. Update the relation's state with the modified entities
        if (!state) {
          state = {} as any;
        }
        state.entityA = entityA;
        state.entityB = entityB;
      },
    },
  });
}
