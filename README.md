# SotaJS

> **Focus on your business logic, not the framework.**

SotaJS (Сота) is a TypeScript framework for developers who believe that business logic is the most valuable asset of a project. It provides a simple, functional, and powerful way to build applications using the principles of Hexagonal Architecture, Domain-Driven Design, and CQRS.

---

## Tired of the Old Ways?

Have you ever felt lost in a sea of decorators, modules, and providers? Does your core business logic seem scattered across countless "service" classes, making your domain objects little more than anemic data bags? Do you spend more time fighting your framework's "magic" than writing valuable code?

**SotaJS is the antidote.**

We believe that code should be simple, explicit, and centered around the domain. We replace complex class hierarchies and dependency injection magic with a straightforward, functional approach that is easy to understand, test, and maintain.

## Core Concepts

SotaJS is built on four key principles to keep your code clean, testable, and focused on business value.

1.  **Rich Domain Models, by Default**
    Forget anemic data objects. SotaJS guides you to build rich, self-validating **Aggregates** that encapsulate business rules and logic. Your domain objects become the first line of defense for ensuring data consistency.

2.  **CQRS Approach with Clear Separation**
    Application logic is expressed as simple, `async` functions called **Use Cases**, clearly separated into **Commands** (that change state) and **Queries** (that read data). This separation makes your code more predictable and easier to reason about.

3.  **Explicit, Hook-Based Dependency Injection**
    No more magic. We replace implicit, decorator-based DI with a transparent `usePort()` hook. A function's dependencies are declared right at the top, making your code easy to trace, understand, and mock.

4.  **Platform-Agnostic Business Logic**
    Your Use Cases return pure DTOs, completely independent of any presentation layer. This allows you to easily integrate with web APIs, Telegram bots, CLI tools, or any other platform without changing your business logic.

---

## The Two-Phase Workflow

SotaJS offers a flexible workflow that adapts to your project's lifecycle, from initial idea to a full-scale application.

### Phase 1: Rapid Prototyping
Get your MVP up and running quickly.

1.  **Define Models:** Describe your data shapes using Zod schemas.
2.  **Write Use Cases:** Implement core application logic as simple, focused functions (Commands and Queries).
3.  **Use In-Memory Adapters:** Start with a generic in-memory repository for data storage.
4.  **Integrate:** Connect your Use Cases to any UI or external service.

### Phase 2: Evolve to Production
As your project grows, enrich your architecture without rewriting.

1.  **Enrich the Domain:** Evolve your simple models into rich **Aggregates** with business logic and invariants.
2.  **Implement Production Adapters:** Swap out in-memory storage with adapters for real databases and services.
3.  **Scale:** Your core logic remains clean, testable, and ready to scale.

For a complete, step-by-step guide, see our primary documentation:
-   **[SotaJS: Architecture and Development Guide](./docs/README.md)**
-   **[CQRS Integration Guide](./docs/cqrs-integration.md)**

## Quick Glimpse

Here is a brief example of the SotaJS style, showcasing the new feature-driven approach.

### 1. Define Ports

Ports are the contracts for your application's dependencies. With the simplified API, you no longer need to wrap the return type in a `Promise`.

```typescript
import { createPort, usePort } from '@maxdev1/sotajs';
import type { Order, User } from './domain';

// Define ports for finding data
const findUserByIdPort = createPort<(id: string) => User | null>();
const findOrdersByUserIdPort = createPort<(userId: string) => Order[]>();

// Define port for saving data
const saveOrderPort = createPort<(order: Order) => void>();
```

### 2. Group Ports into a Feature

A "Feature" is a collection of related ports that defines a cohesive slice of functionality.

```typescript
import { defineFeature } from '@maxdev1/sotajs';

const OrderManagementFeature = defineFeature({
  findUserById: findUserByIdPort,
  findOrdersByUserId: findOrdersByUserIdPort,
  saveOrder: saveOrderPort,
});
```

### 3. Implement a Use Case

Use Cases orchestrate the business logic by using ports to interact with external systems.

```typescript
// Command Use Case
export const createOrderCommand = async (input: unknown) => {
  // Input validation (e.g., with Zod) should happen here
  const { userId, items } = input as any; // Using 'any' for brevity, prefer 'unknown' and validation

  const findUserById = usePort(findUserByIdPort);
  const saveOrder = usePort(saveOrderPort);

  const user = await findUserById(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const order = Order.create({ ...input, userId: user.id });
  await saveOrder(order);

  return {
    success: true,
    orderId: order.id,
    total: order.calculateTotal()
  };
};
```

### 4. Implement the Feature with an Adapter

An Adapter provides the concrete implementation for a feature's ports. A class-based adapter ensures that all ports of the feature are implemented.

```typescript
import { FeaturePorts } from '@maxdev1/sotajs';
import type { Order, User } from './domain';

// The adapter class implements the feature's port contract
class PrismaOrderAdapter implements FeaturePorts<typeof OrderManagementFeature> {
  async findUserById(id: string): Promise<User | null> {
    // const user = await prisma.user.findUnique({ where: { id } });
    return null; // Your implementation here
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    // const orders = await prisma.order.findMany({ where: { userId } });
    return []; // Your implementation here
  }

  async saveOrder(order: Order): Promise<void> {
    // await prisma.order.create({ data: order.props });
    console.log('Order saved!');
  }
}
```

### 5. Compose the Application

At the application's entry point (the "composition root"), define the core and bind the feature to its concrete adapter.

```typescript
import { defineCore } from '@maxdev1/sotajs';

// Define the application core with all its features
const core = defineCore({
  orders: OrderManagementFeature,
});

// Bind the feature to its implementation
core.bindFeatures(({ orders }) => {
  orders.bind(PrismaOrderAdapter);
});

// Now, when createOrderCommand is called, it will use the PrismaOrderAdapter.
```

## Installation

```bash
npm install @maxdev1/sotajs
# or
bun add @maxdev1/sotajs
```

## Key Features

- **✅ CQRS-First Architecture** - Clear separation of commands and queries
- **✅ Rich Domain Models** - Built-in support for Aggregates, Entities, and Value Objects
- **✅ Explicit Dependency Injection** - No magic, just simple hooks
- **✅ Platform-Agnostic** - Easy integration with any presentation layer
- **✅ Type-Safe** - Full TypeScript support with Zod validation
- **✅ Test-Friendly** - Designed for easy unit and integration testing

## Documentation

- **[Architecture Guide](./docs/README.md)** - Complete guide to SotaJS architecture
- **[CQRS Integration](./docs/cqrs-integration.md)** - Detailed CQRS implementation patterns
- **[Development Template](./docs/entry.md)** - Template for starting new projects

## Why SotaJS?

- **Simplicity:** Less boilerplate, more business logic
- **Testability:** Easy to test in isolation without complex setup
- **Flexibility:** Adapt to any platform without changing core logic
- **Maintainability:** Clear separation of concerns and explicit dependencies
- **DDD-Friendly:** Natural fit for Domain-Driven Design practices

---

**Ready to build clean, testable applications?** Check out our [comprehensive documentation](./docs/README.md) to get started!