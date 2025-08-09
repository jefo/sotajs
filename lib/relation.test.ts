import { describe, it, expect, mock } from 'bun:test';
import { z } from 'zod';
import { createRelation } from './relation';
import { createAggregate } from './aggregate';

// 1. Define mock aggregates for testing purposes
const EntityASchema = z.object({
  id: z.string(),
  name: z.string(),
});
const EntityA = createAggregate({
  name: 'EntityA',
  schema: EntityASchema,
  invariants: [],
  actions: {
    updateName: (state, newName: string) => ({ state: { ...state, name: newName } }),
  },
});

const EntityBSchema = z.object({
  id: z.string(),
  value: z.number(),
});
const EntityB = createAggregate({
  name: 'EntityB',
  schema: EntityBSchema,
  invariants: [],
  actions: {
    incrementValue: (state) => ({ state: { ...state, value: state.value + 1 } }),
  },
});

describe('createRelation', () => {
  it('should create a linker that correctly orchestrates the linking of two entities', () => {
    // 2. Arrange
    const mockLinkLogic = mock(({ entityA, entityB }) => {
      entityA.actions.updateName('linked');
      entityB.actions.incrementValue();
    });

    const TestLinker = createRelation({
      name: 'TestLinker',
      schemaA: EntityA.schema,
      schemaB: EntityB.schema,
      link: mockLinkLogic,
    });

    const entityA = EntityA.create({ id: 'a1', name: 'initial' });
    const entityB = EntityB.create({ id: 'b1', value: 10 });
    const linker = TestLinker.create();

    // 3. Act
    linker.actions.link({ entityA, entityB });

    // 4. Assert
    expect(mockLinkLogic).toHaveBeenCalledTimes(1);
    expect(mockLinkLogic).toHaveBeenCalledWith({ entityA, entityB });

    expect(linker.state).toBeDefined();
    expect(linker.state?.entityA.state.name).toBe('linked');
    expect(linker.state?.entityB.state.value).toBe(11);

    expect(entityA.state.name).toBe('linked');
    expect(entityB.state.value).toBe(11);
  });

  it('should have an undefined state before the link action is called', () => {
    const mockLinkLogic = mock(() => {});

    const TestLinker = createRelation({
      name: 'TestLinker',
      schemaA: EntityA.schema,
      schemaB: EntityB.schema,
      link: mockLinkLogic,
    });

    const linker = TestLinker.create();

    expect(linker.state).toEqual({});
  });
});