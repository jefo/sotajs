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

- **Domain Layer** is responsible for its own validation and consistency.
- **Ports** accept a single DTO (`type` or `interface`) for readable and scalable signatures.
- **Use Cases** are pure functions that orchestrate logic. They are responsible for validating all incoming data before passing it to the domain or ports. For a detailed guide, see [Orchestration with Use Cases and Hooks](./use-cases.md).
- **Event-Driven** and **CQRS** principles are baked into the architecture, enabling easy scaling and maintenance.

---

## Quick Start

The example below demonstrates the core workflow in Sota.

```typescript
import { createPort, setPortAdapter, usePort } from '@sota/core';
import { z } from 'zod';

// 1. Define a Port and its DTO in your domain layer.
// The DTO is a simple interface, defining the data shape.
interface FindUserByIdDto {
  id: string;
}
const findUserByIdPort = createPort<(dto: FindUserByIdDto) => Promise<{ id: string; name: string } | null>>();

// 2. Implement a Use Case that validates its input.
// The use case is the application boundary where validation occurs.
const GetUserUseCaseInput = z.object({ id: z.string().uuid() });

const getUserUseCase = async (input: unknown) => {
  // Validate input at the boundary
  const validInput = GetUserUseCaseInput.parse(input);

  const findUserById = usePort(findUserByIdPort);
  const user = await findUserById(validInput);

  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// 3. Create an Adapter in your infrastructure layer.
// It implements the Port's contract, receiving the clean DTO.
const userDbAdapter = async (dto: FindUserByIdDto) => {
  console.log(`Fetching user ${dto.id} from the database...`);
  if (dto.id === 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
    return { id: dto.id, name: 'John Doe' };
  }
  return null;
};

// 4. At the application's entry point, bind the adapter to the port.
setPortAdapter(findUserByIdPort, userDbAdapter);

// 5. Now, you can execute the use case.
const user = await getUserUseCase({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });

console.log(user); // Outputs: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'John Doe' }
```