# Sota

> A Functional, Hexagonal Architecture Framework for TypeScript  
> Inspired by the Russian word "Сота" (honeycomb) — a symbol of a modular, efficient, and natural structure.

---

## What is Sota?

Sota is a modern TypeScript framework for building scalable applications using the principles of **Domain-Driven Design**, **Hexagonal Architecture**, and **Functional Programming**.

Unlike traditional OOP frameworks (like Nest.js) that are built around classes and objects, Sota organizes all code through **functions**. This approach promotes a concise and clean architecture, free from unnecessary boilerplate.

---

## Why Sota?

- **Hexagonal Architecture:** Achieve modularity and a clear separation of concerns through Ports and Adapters.
- **Functional Programming:** All patterns are expressed through pure functions, which simplifies testing and maintenance.
- **Domain-Driven Design:** A strong focus on modeling the domain and business logic.
- **Concise and Minimalist:** No classes or unnecessary abstractions—only what's essential.

---

## Core Concepts

- **Aggregates and Domain Entities** are described through functions and immutable structures.
- **Ports and Adapters** are implemented as functions that connect to the business logic.
- **Use Cases** are pure functions that process input and return a result.
- **Event-Driven** and **CQRS** principles are baked into the architecture, enabling easy scaling and maintenance.

---

## Quick Start

The example below demonstrates the core DI workflow in Sota.

```typescript
import { createPort, setPortAdapter, usePort } from '@sota/core';

// 1. Define a Port in your domain layer.
// A Port is a contract for a piece of infrastructure the application needs.
const findUserByIdPort = createPort<(id: string) => Promise<{ id: string; name: string } | null>>();

// 2. Implement a Use Case in your application layer.
// It uses `usePort` to get the implementation of the port it needs.
const getUserUseCase = async (userId: string) => {
  const findUserById = usePort(findUserByIdPort);
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// 3. Create an Adapter in your infrastructure layer.
// An Adapter is the concrete implementation of a Port.
const userDbAdapter = async (id: string) => {
  console.log(`Fetching user ${id} from the database...`);
  // In a real app, you would query a database or call an API.
  if (id === '123') {
    return { id: '123', name: 'John Doe' };
  }
  return null;
};

// 4. At your application's entry point, bind the adapter to the port.
setPortAdapter(findUserByIdPort, userDbAdapter);

// 5. Now, you can execute the use case.
const user = await getUserUseCase('123');
console.log(user); // Outputs: { id: '123', name: 'John Doe' }
```