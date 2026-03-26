# SotaJS - Project Context

## Project Overview

**SotaJS** (Сота) is a TypeScript framework for building applications using **Hexagonal Architecture**, **Domain-Driven Design (DDD)**, and **CQRS** principles. The framework's motto is "Focus on your business logic, not the framework."

### Core Philosophy

- **Rich Domain Models**: Build aggregates that encapsulate business rules, not anemic data objects
- **CQRS Approach**: Clear separation of Commands (state-changing) and Queries (data-reading)
- **Explicit Dependency Injection**: Hook-based `usePort()` pattern instead of decorator magic
- **Platform-Agnostic**: Business logic returns pure DTOs, independent of presentation layer

### Key Technologies

- **Runtime**: Node.js >= 18.0.0
- **Package Manager**: Bun (primary), npm (alternative)
- **Language**: TypeScript 5.0+
- **Key Dependencies**: Zod (validation), Immer (immutable state), BottleJS (DI container), Grammy (Telegram bot API)

## Project Structure

```
sotajs/
├── lib/                    # Core framework source code
│   ├── aggregate.ts        # Aggregate factory (DDD)
│   ├── entity.ts           # Entity factory (DDD)
│   ├── value-object.ts     # Value Object factory (DDD)
│   ├── feature.ts          # Feature definition (defineFeature)
│   ├── core.ts             # Core container (defineCore)
│   ├── di.v2.ts            # Dependency Injection system
│   ├── ports/              # Built-in port definitions
│   └── adapters/           # Built-in adapter implementations
├── docs/                   # Documentation files
│   ├── README.md           # Main architecture guide (Russian)
│   ├── cqrs-integration.md # CQRS patterns
│   ├── entry.md            # Development template
│   └── recipes/            # Usage recipes
├── examples/               # Example applications
│   ├── booking/
│   ├── pizza-shop/
│   └── tg-paywall/
├── index.ts                # Main entry point
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Building and Running

### Installation

```bash
bun install
```

### Build

```bash
bun run build
# or
npm run build
```

Build output goes to `dist/` directory.

### Testing

```bash
bun test
```

### Publishing

```bash
npm run prepublishOnly  # Runs build before publish
npm publish
```

## Core Concepts

### 1. Domain Objects

**Value Objects** - Immutable objects defined by their attributes:
```typescript
const Money = createValueObject({
  schema: z.object({ amount: z.number(), currency: z.string() }),
  actions: { add: (state, amount) => { state.amount += amount; } }
});
```

**Entities** - Objects with unique ID and lifecycle:
```typescript
const User = createEntity({
  schema: z.object({ id: z.string().uuid(), email: z.string().email() }),
  actions: { updateEmail: (state, email) => { state.email = email; } }
});
```

**Aggregates** - Transactional boundaries grouping entities/VOs:
```typescript
const Order = createAggregate({
  name: 'Order',
  schema: OrderSchema,
  entities: { customerInfo: CustomerInfo },
  invariants: [(props) => { if (props.items.length === 0) throw Error(); }],
  actions: { addItem: (state, item) => { state.items.push(item); } }
});
```

### 2. Ports and Adapters

**Ports** - Abstract contracts for dependencies:
```typescript
const findUserByIdPort = createPort<(id: string) => User | null>();
```

**Features** - Group related ports:
```typescript
const OrderFeature = defineFeature({
  findUserById: findUserByIdPort,
  saveOrder: saveOrderPort
});
```

**Adapters** - Concrete implementations:
```typescript
class PrismaOrderAdapter implements FeaturePorts<typeof OrderFeature> {
  async findUserById(id: string) { /* ... */ }
  async saveOrder(order: Order) { /* ... */ }
}
```

### 3. Dependency Injection

**Define Core** - Compose application features:
```typescript
const core = defineCore({
  orders: OrderFeature,
  auth: AuthFeature
});
```

**Bind Adapters** - At composition root:
```typescript
core.bindFeatures(({ orders, auth }) => {
  orders.bind(PrismaOrderAdapter);
  auth.bind(JwtAuthAdapter);
});
```

**Use in Use Cases**:
```typescript
const createOrderCommand = async (input: CreateOrderInput) => {
  const [findUserById, saveOrder] = usePorts(findUserByIdPort, saveOrderPort);
  // ... business logic
};
```

### 4. Use Cases (CQRS)

**Commands** - Change state:
```typescript
export const createOrderCommand = async (input: CreateOrderInput) => {
  // ... validation, domain logic, persistence
  return { success: true, orderId: order.id };
};
```

**Queries** - Read data:
```typescript
export const getUserOrdersQuery = async (userId: string) => {
  // ... fetch and transform
  return { orders: [...], totalCount: 10 };
};
```

## Development Workflow

### Two-Phase Approach

**Phase 1: Rapid Prototyping**
1. Define models with Zod schemas
2. Write Use Cases as simple functions
3. Use in-memory adapters
4. Integrate with UI/external services

**Phase 2: Production Evolution**
1. Evolve models to rich Aggregates
2. Implement production adapters (Prisma, PostgreSQL, etc.)
3. Scale without rewriting core logic

### File Organization Convention

```
src/
├── domain/
│   ├── user.entity.ts
│   ├── order.aggregate.ts
│   └── ports/
│       ├── user.ports.ts
│       └── order.ports.ts
├── application/
│   ├── features/
│   │   └── orders.feature.ts
│   ├── commands/
│   │   └── create-order.command.ts
│   ├── queries/
│   │   └── get-user-orders.query.ts
│   └── index.ts          # defineCore() call
├── infrastructure/
│   ├── adapters/
│   │   ├── prisma-order.adapter.ts
│   │   └── jwt-auth.adapter.ts
│   └── persistence/
└── main.ts               # Composition root (bindFeatures)
```

## Testing Practices

- Unit test domain objects (Aggregates, Entities, VOs) in isolation
- Mock ports for Use Case testing
- Use fixture-driven development for complex scenarios
- Test invariants and business rules thoroughly

## Documentation

- **[docs/README.md](./docs/README.md)** - Main architecture guide (Russian)
- **[docs/cqrs-integration.md](./docs/cqrs-integration.md)** - CQRS patterns
- **[docs/entry.md](./docs/entry.md)** - Template for new projects
- **[docs/fixture-driven-development.md](./docs/fixture-driven-development.md)** - Testing approach

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/di.v2.ts` | Core DI system (createPort, usePort, defineCore) |
| `lib/feature.ts` | Feature definition utilities |
| `lib/aggregate.ts` | Aggregate factory with Immer-based state |
| `lib/entity.ts` | Entity factory with auto-setters |
| `lib/value-object.ts` | Value Object factory |
| `index.ts` | Main package entry point |
| `tsconfig.build.json` | Build configuration |

## Common Patterns

### Port Co-location
Define ports alongside their domain objects:
```typescript
// domain/user.entity.ts
export const User = createEntity(...);
export const findUserByIdPort = createPort<(id: string) => User | null>();
```

### Domain Events
Aggregates can emit events:
```typescript
actions: {
  payOrder: (state, method) => {
    state.status = 'paid';
    return { event: new OrderPaidEvent(state.id) };
  }
}
```

### Computed Properties
```typescript
const Order = createAggregate({
  // ...
  computed: {
    isConfirmed: (props) => props.status === 'confirmed',
    total: (props) => props.items.reduce((sum, i) => sum + i.price, 0)
  }
});
```
