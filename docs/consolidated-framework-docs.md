# SotaJS Framework Documentation

SotaJS is an opinionated TypeScript framework that enforces good architecture by combining Domain-Driven Design (DDD), Hexagonal Architecture (Ports & Adapters), and Clean Architecture principles. It emphasizes functional programming patterns and uses a "use-case first" development approach.

## Core Architecture

### Architectural Layers

1. **Domain Layer** (innermost) - Core business logic
   - Aggregates: Transactional consistency boundaries with invariants
   - Entities: Objects with unique identity
   - Value Objects: Immutable objects defined by attributes
   - Domain Ports: Abstract interfaces for external capabilities

2. **Application Layer** - Use cases and orchestration
   - Use Cases: Atomic operations that coordinate domain logic
   - Application Ports: Contracts for external services
   - DTOs: Data Transfer Objects for input/output

3. **Infrastructure Layer** - Concrete implementations
   - Adapters: Implementations of ports
   - External integrations: Databases, APIs, messaging systems

4. **Presentation Layer** (outermost) - User interfaces and API endpoints
   - Controllers: Handle requests and call use cases
   - Views: Render UI components

### Dependency Flow

Dependencies flow strictly inward:
- Presentation depends on Application
- Application depends on Domain
- Infrastructure depends on Domain and Application ports
- Domain has no dependencies

## Core Concepts

### Aggregates

Aggregates are clusters of domain objects treated as a single unit for transactional consistency. SotaJS uses a `createAggregate` factory:

```typescript
const Order = createAggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'paid', 'shipped']),
    items: z.array(z.object({ productId: z.string(), price: z.number() })),
  }),
  // Business rules that throw errors if violated
  invariants: [
    (state) => {
      if (state.status === 'shipped' && state.items.length === 0) {
        throw new Error('Cannot ship an empty order.');
      }
    }
  ],
  // State transitions that return new state and optional events
  actions: {
    pay: (state) => {
      if (state.status !== 'pending') {
        throw new Error('Only pending orders can be paid.');
      }
      return { state: { ...state, status: 'paid' }, event: { type: 'OrderPaid' } };
    }
  }
});
```

### Use Cases

Use cases are async functions that orchestrate domain logic and infrastructure interactions:

```typescript
const createOrderUseCase = async (input: CreateOrderInput) => {
  // Validate at boundary
  const validInput = CreateOrderInputSchema.parse(input);

  // Declare dependencies via hooks
  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);

  // Orchestrate logic
  const user = await findUserById({ id: validInput.userId });
  if (!user) throw new Error('User not found');

  const order = Order.create(validInput);
  await saveOrder(order);

  return { orderId: order.id };
};
```

### Ports & Adapters

Ports define contracts, adapters implement them:

```typescript
// Port definition
const findUserByIdPort = createPort<(dto: { id: string }) => Promise<User | null>>();

// Adapter implementation
const userDbAdapter = async (dto: { id: string }) => {
  // ... database logic
  return user;
};

// Binding in composition root
setPortAdapter(findUserByIdPort, userDbAdapter);
```

### Value Objects & Entities

Value Objects are immutable and defined by their attributes:

```typescript
const Address = createValueObject(AddressSchema, 'Address');
```

Entities have unique identities:

```typescript
const User = createEntity(UserSchema, 'User');
```

## Development Process

1. **Use Case Definition**: Define function signatures and required ports
2. **Domain Design**: Create aggregates, entities, and value objects based on use case needs
3. **Integration**: Connect domain logic with use cases
4. **Testing**: Write integration tests with mocked ports
5. **Infrastructure**: Implement adapters for real external systems
6. **Composition**: Bind adapters to ports in the composition root

## Testing Philosophy

SotaJS emphasizes integration-first testing with these principles:
- **Black-Box Testing**: Test use cases as pure functions, validating only inputs and outputs
- **Local Mocking**: Each test creates its own mocks for external dependencies
- **Business Scenario Focus**: Tests validate complete user journeys using real DTOs and schemas
- **Test-Driven Architecture**: Integration tests validate architectural decisions

Example test structure:
```typescript
describe('createOrderUseCase', () => {
  beforeEach(() => {
    resetDI();
    setPortAdapter(findUserByIdPort, mockFindUserById);
    setPortAdapter(saveOrderPort, mockSaveOrder);
  });

  it('should create and save a post for a valid user', async () => {
    // Test implementation with local mocks
  });
});
```

## Dependency Injection

SotaJS uses a React-like hook mechanism:
- `createPort<T>()` - Define port contracts
- `usePort(port)` - Consume dependencies in use cases
- `setPortAdapter(port, adapter)` - Bind implementations
- `resetDI()` - Clear container between tests

All ports accept a single DTO parameter for consistency.

## Key Principles

- **Reference Aggregates by ID Only**: Never hold direct references to other aggregate instances
- **One Aggregate per Transaction**: Each transaction modifies only one aggregate
- **CQRS for Ports**: Separate read and write ports for different data needs
- **Test-Driven**: Business logic validated through integration tests before implementation
- **Framework-Agnostic**: Core logic decoupled from delivery mechanisms
