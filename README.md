# Sota

> **Focus on your business logic, not the framework.**

Sota (Сота, Russian for honeycomb) is a TypeScript framework for developers who believe that business logic is the most valuable asset of a project and should be treated as such. It provides a simple, functional, and powerful way to build applications using the principles of Hexagonal Architecture and Domain-Driven Design.

---

## Tired of the Old Ways?

Have you ever felt lost in a sea of decorators, modules, and providers? Does your core business logic seem scattered across countless "service" classes, making your domain objects little more than anemic data bags? Do you spend more time fighting your framework's "magic" than writing valuable code?

**Sota is the antidote.**

We believe that code should be simple, explicit, and centered around the domain. We replace complex class hierarchies and dependency injection magic with a straightforward, functional approach that is easy to understand, test, and maintain.

## Core Concepts

Sota is built on four key principles to keep your code clean, testable, and focused on business value.

1.  **Rich Domain Models, by Default**
    Forget anemic data objects. Sota guides you to build rich, self-validating **Aggregates** that encapsulate business rules and logic. Your domain objects become the first line of defense for ensuring data consistency.

2.  **Functional Use Cases as Orchestrators**
    Application logic is expressed as simple, `async` functions called **Use Cases**. They orchestrate the flow of work by interacting with your domain models and external services, without the boilerplate of traditional service classes.

3.  **Explicit, Hook-Based Dependency Injection**
    No more magic. We replace implicit, decorator-based DI with a transparent `usePort()` hook. A function's dependencies are declared right at the top, making your code easy to trace, understand, and mock.

4.  **Testability as a Foundation**
    The entire architecture is designed to be tested. The combination of pure domain logic and explicit dependencies allows you to test your entire business flow in complete isolation, achieving 100% confidence before you ever touch a database.

---

## The Workflow: An "Inside-Out" Approach

Sota encourages an "inside-out" development process that puts your business logic first.

1.  **Model the Domain (The Pure Business Logic):** Create rich Aggregates that encapsulate and enforce your business rules. This is the pure, testable heart of your application.
2.  **Define the Use Case (The Orchestrator):** Write a simple function that orchestrates the interaction between your domain model and the necessary ports (e.g., for database persistence).
3.  **Test in Isolation:** Write unit tests that verify your business logic against mock ports, ensuring correctness before any infrastructure is written.
4.  **Implement Adapters:** Finally, write the infrastructure code (e.g., database queries, API calls) that connects your application to the real world.

For a complete, step-by-step guide, see our primary implementation document:
-   **[Implementation Workflow: Building a Hexagon in Sota](./docs/implementation-workflow.md)**

## Dive Deeper

-   **[Domain Modeling in Sota](./docs/domain-modeling.md)**: Learn how to create rich, robust domain models.
-   **[Domain Design Guidelines](./docs/domain-design-guidelines.md)**: A practical guide to help you choose between Aggregates, Entities, and Value Objects.
-   **[Orchestration with Use Cases and Hooks](./docs/use-cases.md)**: Understand how to write and test your application's use cases.

---

## Quick Glimpse

Here is a brief example of the Sota style. For a full explanation, please see the [Implementation Workflow](./docs/implementation-workflow.md).

```typescript
import { createPort, setPortAdapter, usePort } from '@sota/core';
import { z } from 'zod';

// 1. Define a Port and its DTO (the contract)
interface FindUserByIdDto { id: string; }
const findUserByIdPort = createPort<(dto: FindUserByIdDto) => Promise<{ id: string; name: string } | null>>();

// 2. Implement a Use Case (the orchestrator)
const GetUserUseCaseInput = z.object({ id: z.string().uuid() });

const getUserUseCase = async (input: unknown) => {
  // Validate input at the boundary
  const validInput = GetUserUseCaseInput.parse(input);

  // Get dependencies via hooks
  const findUserById = usePort(findUserByIdPort);

  // Execute logic
  const user = await findUserById(validInput);
  if (!user) { throw new Error('User not found'); }
  return user;
};

// 3. Create an Adapter (the infrastructure)
const userDbAdapter = async (dto: FindUserByIdDto) => {
  // ... logic to fetch user from a database
};

// 4. Bind the implementation at the application's entry point
setPortAdapter(findUserByIdPort, userDbAdapter);

// 5. Execute
const user = await getUserUseCase({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
```
