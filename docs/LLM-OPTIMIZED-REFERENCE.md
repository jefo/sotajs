# Sota Framework: LLM-Optimized Reference

Sota is a TypeScript framework designed to help developers focus on core business logic by leveraging well-known architectural patterns like Hexagonal Architecture and Domain-Driven Design (DDD). This document provides a concise overview of how Sota implements these practices, with a strong emphasis on code examples, particularly from its test suite.

## Core Concepts & Sota's Implementation

Sota provides specific constructs for common DDD building blocks, ensuring consistency and testability.

### Aggregates

**Concept:** An Aggregate is a cluster of domain objects treated as a single unit for transactional consistency. It's a rich domain model that enforces its own invariants (business rules) and manages its lifecycle.

**Sota's Implementation:** Sota uses a `createAggregate` factory to define aggregates. This factory takes a configuration object including:
*   A `zod` schema for the aggregate's properties (`props`).
*   `invariants`: Pure functions that define business rules and throw errors if violated. These are automatically checked after every action.
*   `actions`: Pure functions that define state transitions. They receive the current state and a payload, returning a new state and optionally a domain event.

**Code Example (from `lib/aggregate.test.ts` and `docs/rich-aggregates.md`):**

```typescript
import { z } from 'zod';
import { createAggregate } from './aggregate'; // Assuming this path

// 1. Define the properties schema
const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'shipped']),
  items: z.array(z.object({ productId: z.string(), price: z.number() })),
});

type OrderState = z.infer<typeof OrderSchema>;

// 2. Define the aggregate using the factory
export const Order = createAggregate({
  name: 'Order',
  schema: OrderSchema,

  // 3. Define the INVARIANTS (business rules)
  invariants: [
    (state) => {
      if (state.status === 'shipped' && state.items.length === 0) {
        throw new Error('Cannot ship an empty order.');
      }
    },
    (state) => {
        const total = state.items.reduce((sum, item) => sum + item.price, 0);
        if (total > 10000) {
            throw new Error('Order total cannot exceed $10,000.');
        }
    }
  ],

  // 4. Define the ACTIONS (state transitions)
  actions: {
    pay: (state: OrderState) => {
      if (state.status !== 'pending') {
        throw new Error('Only pending orders can be paid.');
      }
      const newState = { ...state, status: 'paid' as const };
      return { state: newState, event: { type: 'OrderPaid', orderId: state.id } };
    },

    ship: (state: OrderState) => {
      if (state.status !== 'paid') {
        throw new Error('Only paid orders can be shipped.');
      }
      const newState = { ...state, status: 'shipped' as const };
      return { state: newState, event: { type: 'OrderShipped', orderId: state.id } };
    },
  },
});

// Usage in a test:
describe('Order Aggregate', () => {
  it('should allow paying a pending order', () => {
    const order = Order.create({ id: '1', status: 'pending', items: [{ productId: 'p1', price: 100 }] });
    const { state, event } = order.actions.pay();
    expect(state.status).toBe('paid');
    expect(event).toEqual({ type: 'OrderPaid', orderId: '1' });
  });

  it('should throw if paying a non-pending order', () => {
    const order = Order.create({ id: '1', status: 'paid', items: [{ productId: 'p1', price: 100 }] });
    expect(() => order.actions.pay()).toThrow('Only pending orders can be paid.');
  });
});
```

### Use Cases

**Concept:** Use Cases represent atomic operations in the application layer. They orchestrate domain logic and interactions with external services (via Ports).

**Sota's Implementation:** Use Cases are `async` functions. They validate their input using `zod` schemas at the boundary and receive dependencies explicitly via the `usePort` hook.

**Code Example (from `docs/use-cases.md`):**

```typescript
// application/use-cases/create-order.use-case.ts
import { z } from 'zod';
import { usePort } from '../../lib/di'; // Assuming this path
import { findUserByIdPort, saveOrderPort } from '../../domain/ports'; // Assuming these ports exist
import { Order } from '../../domain/order.aggregate'; // Assuming Order aggregate exists

// Zod schema for input validation
const CreateOrderInputSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive()
  })),
});

type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const createOrderUseCase = async (input: CreateOrderInput) => {
  // 1. Validate input at the boundary of the use case
  const validInput = CreateOrderInputSchema.parse(input);

  // 2. Declare dependencies with hooks
  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);

  // 3. Orchestrate logic, using validated data
  const user = await findUserById({ id: validInput.userId });
  if (!user) {
    throw new Error('User not found');
  }

  // 4. Call domain logic (e.g., create an Order aggregate)
  const order = Order.create(validInput);

  // 5. Use ports to interact with infrastructure
  await saveOrder(order);

  return { orderId: order.id };
};
```

### Ports & Dependency Injection

**Concept:** Ports define contracts for external services (e.g., databases, APIs, email services). Dependency Injection (DI) provides concrete implementations (Adapters) for these ports at the application's composition root.

**Sota's Implementation:** Sota uses `createPort` to define a port contract, `setPortAdapter` to bind a concrete implementation (Adapter), and `usePort` (a React-like hook) to consume the dependency within Use Cases. All ports accept a single Data Transfer Object (DTO) argument.

**Code Example (from `lib/di.test.ts` and `docs/use-cases.md`):**

```typescript
import { createPort, setPortAdapter, usePort, resetDI } from './di'; // Assuming this path
import { z } from 'zod';

// 1. Define a Port and its DTO (the contract)
interface FindUserByIdDto { id: string; }
const findUserByIdPort = createPort<(dto: FindUserByIdDto) => Promise<{ id: string; name: string } | null>>();

// 2. Implement a Use Case that uses the port
const GetUserUseCaseInput = z.object({ id: z.string().uuid() });
const getUserUseCase = async (input: unknown) => {
  const validInput = GetUserUseCaseInput.parse(input);
  const findUserById = usePort(findUserByIdPort); // Consume the port
  const user = await findUserById(validInput);
  if (!user) { throw new Error('User not found'); }
  return user;
};

// 3. Create an Adapter (the infrastructure implementation)
const userDbAdapter = async (dto: FindUserByIdDto) => {
  // ... logic to fetch user from a database
  if (dto.id === 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
    return { id: dto.id, name: 'Test User' };
  }
  return null;
};

// Usage in a test (Composition Root):
describe('Dependency Injection', () => {
  beforeEach(() => {
    resetDI(); // Clear DI container before each test
  });

  it('should resolve a bound adapter', async () => {
    setPortAdapter(findUserByIdPort, userDbAdapter); // Bind the adapter
    const user = await getUserUseCase({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
    expect(user).toEqual({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Test User' });
  });

  it('should throw if an adapter is not bound', async () => {
    // No setPortAdapter call
    await expect(getUserUseCase({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })).rejects.toThrow('Port not implemented');
  });
});
```

### Value Objects

**Concept:** Value Objects are immutable objects defined by their attributes, not by a unique identity. If any attribute changes, it becomes a new Value Object.

**Sota's Implementation:** Sota uses a `createValueObject` factory. It takes a `zod` schema for its `props` and ensures immutability.

**Code Example (from `lib/value-object.test.ts`):**

```typescript
import { z } from 'zod';
import { createValueObject } from './value-object'; // Assuming this path

// 1. Define the properties schema
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string(),
});

// 2. Create the Value Object
export const Address = createValueObject(AddressSchema, 'Address');

// Usage in a test:
describe('Value Object', () => {
  it('should create a value object with valid properties', () => {
    const address = Address.create({ street: '123 Main St', city: 'Anytown', zip: '12345' });
    expect(address.street).toBe('123 Main St');
    expect(address.city).toBe('Anytown');
  });

  it('should throw an error for invalid properties', () => {
    expect(() => Address.create({ street: '123 Main St', city: 'Anytown', zip: 12345 as any })).toThrow();
  });

  it('should be immutable', () => {
    const address = Address.create({ street: '123 Main St', city: 'Anytown', zip: '12345' });
    // Attempting to modify directly will not work due to readonly props
    // address.street = 'New Street'; // This would be a TypeScript error
    expect(address.street).toBe('123 Main St');
  });
});
```

### Entities

**Concept:** Entities are objects with a distinct, unique identity that persists over time, even if their attributes change.

**Sota's Implementation:** Sota uses a `createEntity` factory. It takes a `zod` schema for its `props` and ensures that the entity has a unique identifier.

**Code Example (from `lib/entity.test.ts`):**

```typescript
import { z } from 'zod';
import { createEntity } from './entity'; // Assuming this path

// 1. Define the properties schema (must include an 'id')
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

// 2. Create the Entity
export const User = createEntity(UserSchema, 'User');

// Usage in a test:
describe('Entity', () => {
  it('should create an entity with valid properties', () => {
    const user = User.create({ id: 'some-uuid', name: 'John Doe', email: 'john.doe@example.com' });
    expect(user.id).toBe('some-uuid');
    expect(user.name).toBe('John Doe');
  });

  it('should throw an error for invalid properties', () => {
    expect(() => User.create({ id: 'invalid-uuid', name: 'John Doe', email: 'invalid-email' })).toThrow();
  });

  it('should allow updating properties', () => {
    const user = User.create({ id: 'some-uuid', name: 'John Doe', email: 'john.doe@example.com' });
    const updatedUser = user.update({ name: 'Jane Doe' }); // Assuming an update method exists or direct mutation is allowed for entities
    expect(updatedUser.name).toBe('Jane Doe');
    expect(updatedUser.id).toBe(user.id); // ID remains the same
  });
});
```

## Workflow: The "Inside-Out" Approach

Sota encourages an "inside-out" development process, prioritizing business logic:

1.  **Define the Use Case:** Sketch the use case's input schema and declare its port dependencies.
2.  **Implement Domain Logic:** Build rich Aggregates, Entities, and Value Objects with their encapsulated business rules.
3.  **Test in Isolation:** Write unit tests for your Use Cases and domain objects, mocking out ports to ensure fast, reliable tests.
4.  **Implement Adapters:** Create concrete implementations for your ports (e.g., database adapters, API clients).
5.  **Bind Adapters:** At the application's entry point (composition root), bind the real adapters to their respective ports.

## Testing Philosophy

Sota's design inherently promotes highly testable code. By defining Use Cases as pure functions and using explicit dependency injection via `usePort`, you can easily mock external dependencies (ports) in your tests. This allows for fast, isolated unit tests that provide high confidence in your business logic without relying on slow or flaky external systems. Tests are often the most direct and up-to-date examples of how to use the framework's features.
