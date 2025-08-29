# Sota Framework: LLM-Optimized Reference

Sota is an opinionated TypeScript framework designed to help developers focus on core business logic by leveraging well-known architectural patterns like Hexagonal Architecture and Domain-Driven Design (DDD). Unlike other frameworks that provide tools and leave architectural decisions to developers, Sota enforces a specific development process that ensures consistent, testable, and maintainable code. This document provides a concise overview of how Sota implements these practices, with a strong emphasis on code examples, particularly from its test suite.

## Framework Philosophy

Sota is built on the principle that **good architecture should be enforced, not optional**. The framework provides specific constructs for common DDD building blocks while dictating a development process that ensures:

- **Use-Case Driven Development**: All development starts with defining application boundaries
- **Explicit Contracts**: Every interaction between layers is explicitly defined through schemas and ports
- **Test-Driven Integration**: Business logic is validated through comprehensive testing before implementation
- **Holistic System Design**: Each use case is fully designed before moving to domain modeling

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

## The Sota Development Process: Use-Case-First Approach

Sota enforces a structured development process that ensures each feature is thoroughly designed before implementation. This opinionated approach prevents common architectural mistakes and promotes system cohesion.

### Phase 1: Use Case Definition & Application Boundary Design

Development begins at the application layer, not the domain. This ensures that business requirements drive technical design.

**Steps:**
1. **Define Use Case Signatures**: Write the function signature and input/output DTOs using Zod schemas
2. **Declare Application-Level Ports**: Identify external integrations the use case will need (APIs, LLMs, notification services, etc.)
3. **Validate Business Rules**: Ensure the use case signature captures all business constraints

**Example:**
```typescript
// 1. Define the use case signature first
const CreateOrderInputSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive()
  })),
});

const CreateOrderOutputSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed']),
  total: z.number().positive()
});

// 2. Declare application-level ports (external integrations)
const notifyUserPort = createPort<(dto: {userId: string, message: string}) => Promise<void>>();
const validatePaymentPort = createPort<(dto: {amount: number, method: string}) => Promise<boolean>>();

// 3. Write the use case skeleton
export const createOrderUseCase = async (input: unknown) => {
  const validInput = CreateOrderInputSchema.parse(input);
  
  // Application-level dependencies will be injected
  const notifyUser = usePort(notifyUserPort);
  const validatePayment = usePort(validatePaymentPort);
  
  // Business logic will be implemented after domain design
  // TODO: Implement after domain entities are designed
};
```

**Critical Rule**: Each use case must be **completely defined** (signature, DTOs, ports) before moving to the next phase. This ensures the system is viewed holistically.

### Phase 2: Domain Entity Design

Only after ALL use cases are defined, move to domain design. Use the use cases as requirements for domain functionality and DTOs as data requirements.

**Steps:**
1. **Extract Domain Entities**: From use case requirements, identify entities, value objects, and their behaviors
2. **Design Data Access Ports**: Define repository-like ports for domain entity persistence and retrieval
3. **Define Business Rules**: Implement invariants and domain logic based on use case needs

**Note:** At this phase, focus on designing individual entities, not aggregates. Aggregate definition is a separate architectural concern that comes after the core workflow.

**Example:**
```typescript
// Domain entities emerge from use case requirements
const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })),
  status: z.enum(['pending', 'confirmed', 'shipped']),
  total: z.number().positive()
});

// Entity with domain actions
export const Order = createEntity({
  schema: OrderSchema,
  actions: {
    updateStatus: (state, newStatus: 'pending' | 'confirmed' | 'shipped') => {
      if (state.status === 'shipped') {
        throw new Error('Cannot change status of shipped order');
      }
      return { ...state, status: newStatus };
    },
    addItem: (state, item: { productId: string; quantity: number; price: number }) => {
      const newItems = [...state.items, item];
      const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { ...state, items: newItems, total: newTotal };
    }
  }
});

// Value objects for complex domain concepts
const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().positive()
});

export const OrderItem = createValueObject(OrderItemSchema, 'OrderItem');

// User entity
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email()
});

export const User = createEntity({
  schema: UserSchema,
  actions: {
    updateEmail: (state, newEmail: string) => ({ ...state, email: newEmail })
  }
});

// Product entity
const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().positive()
});

export const Product = createEntity({
  schema: ProductSchema,
  actions: {
    updatePrice: (state, newPrice: number) => ({ ...state, price: newPrice })
  }
});

// Data access ports defined at domain level - work with entities, not DTOs
const findUserByIdPort = createPort<(id: string) => Promise<User | null>>();
const saveOrderPort = createPort<(order: Order) => Promise<void>>();
const findProductByIdPort = createPort<(id: string) => Promise<Product | null>>();
```

### Phase 3: Domain-Application Integration

Connect the domain logic with the application use cases.

**Steps:**
1. **Implement Use Case Logic**: Use domain entities within use cases
2. **Validate Integration**: Ensure domain objects satisfy use case DTOs
3. **Handle Domain Events**: Wire up event handlers if needed

**Example:**
```typescript
export const createOrderUseCase = async (input: unknown) => {
  const validInput = CreateOrderInputSchema.parse(input);
  
  // Data access ports (defined in Phase 2) - work with entities
  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);
  const findProductById = usePort(findProductByIdPort);
  
  // Application-level ports (defined in Phase 1)
  const notifyUser = usePort(notifyUserPort);
  const validatePayment = usePort(validatePaymentPort);
  
  // 1. Validate user exists
  const user = await findUserById(validInput.userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // 2. Validate products exist and get prices
  const items = [];
  for (const item of validInput.items) {
    const product = await findProductById(item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    items.push({ ...item, price: product.state.price });
  }
  
  // 3. Create domain entity
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const order = Order.create({
    id: crypto.randomUUID(),
    userId: validInput.userId,
    items,
    status: 'pending',
    total: totalAmount
  });
  
  // 4. Save entity through port (domain layer works with entities)
  await saveOrder(order);
  
  // 5. Notify user about order creation (application layer uses DTOs)
  await notifyUser({ 
    userId: validInput.userId, 
    message: `Order ${order.id} created successfully` 
  });
  
  // 6. Convert entity state to DTO for response (application layer boundary)
  return CreateOrderOutputSchema.parse({
    orderId: order.id,
    status: order.state.status,
    total: order.state.total
  });
};
```

### Phase 4: High-Level Integration Testing

Write comprehensive integration tests that validate entire business scenarios using mocked ports.

**Critical Rules:**
- **Black-Box Testing**: Test use cases as pure functions - validate inputs and outputs only
- **No Internal Call Verification**: Do not test port calls - this violates encapsulation
- **Local Mocks Only**: Each test creates its own port mocks - no global test setup
- **Business Scenario Focus**: Test complete user journeys using real DTOs and schemas

**Example:**
```typescript
import { test, expect, beforeEach } from "bun:test";

describe('Order Creation Scenario', () => {
  beforeEach(() => {
    resetDI(); // Clear DI container before each test
  });

  test('should create order for valid user with available products', async () => {
    // Local mocks created per test
    // Mock returns domain entities, not plain objects
    const mockUser = User.create({
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com'
    });
    
    const mockProduct = Product.create({
      id: 'product-456',
      name: 'Test Product',
      price: 29.99
    });
    
    const mockFindUserById = vi.fn().mockResolvedValue(mockUser);
    const mockFindProductById = vi.fn().mockResolvedValue(mockProduct);
    
    const mockSaveOrder = jest.fn().mockResolvedValue(undefined);
    const mockNotifyUser = jest.fn().mockResolvedValue(undefined);
    const mockValidatePayment = jest.fn().mockResolvedValue(true);
    
    // Bind mocks locally
    setPortAdapter(findUserByIdPort, mockFindUserById);
    setPortAdapter(findProductByIdPort, mockFindProductById);
    setPortAdapter(saveOrderPort, mockSaveOrder);
    setPortAdapter(notifyUserPort, mockNotifyUser);
    setPortAdapter(validatePaymentPort, mockValidatePayment);
    
    // Test the complete scenario - black box approach
    const result = await createOrderUseCase({
      userId: 'user-123',
      items: [{ productId: 'product-456', quantity: 2 }]
    });
    
    // Validate only inputs and outputs - no internal implementation details
    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('pending');
    expect(result.total).toBe(59.98); // 2 * 29.99
  });

  test('should fail when user does not exist', async () => {
    const mockFindUserById = vi.fn().mockResolvedValue(null);
    setPortAdapter(findUserByIdPort, mockFindUserById);
    
    // Black box test - only validate the error response
    await expect(createOrderUseCase({
      userId: 'nonexistent-user',
      items: [{ productId: 'product-456', quantity: 2 }]
    })).rejects.toThrow('User not found');
  });
});
```

### Phase 5: Implementation Completion

Continue iterating on the implementation until all integration tests pass. Only when tests are green does the task move to review status.

**Success Criteria:**
- All use cases have complete implementations
- All integration tests pass
- Domain invariants are properly enforced
- Port contracts are satisfied

This process ensures that business logic is thoroughly validated before any infrastructure code is written, leading to more robust and maintainable systems.

## Testing Philosophy

Sota's opinionated approach to testing ensures that business logic is validated at the right level of abstraction. The framework promotes:

**Integration-First Testing**: Rather than focusing on unit tests of individual functions, Sota emphasizes high-level integration tests that validate complete business scenarios. This approach catches integration issues early while providing confidence in the system's behavior.

**Local Mocking**: Each test creates its own mocks for external dependencies (ports). This prevents test coupling and makes tests more reliable and easier to understand. Global test setup is discouraged.

**Business Scenario Validation**: Tests should read like business requirements, validating complete user journeys rather than technical implementation details.

**Test-Driven Architecture**: The testing phase is where architectural decisions are validated. If integration tests are difficult to write or understand, it indicates architectural problems that should be addressed.

By defining Use Cases as pure functions and using explicit dependency injection via `usePort`, you can easily mock external dependencies in your tests. This allows for fast, reliable integration tests that provide high confidence in your business logic without relying on slow or flaky external systems. Tests in Sota serve as both validation and documentation of the system's behavior.
