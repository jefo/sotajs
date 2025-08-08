# Sota

> **Focus on your business logic, not the framework.**

Sota (Сота, Russian for honeycomb) is a TypeScript framework for developers who believe that business logic is the most valuable asset of a project and should be treated as such. It provides a simple, functional, and powerful way to build applications using the principles of Hexagonal Architecture and Domain-Driven Design.

---

## Tired of the Old Ways?

Have you ever felt lost in a sea of decorators, modules, and providers? Does your core business logic seem scattered across countless "service" classes, making your domain objects little more than anemic data bags? Do you spend more time fighting your framework's "magic" than writing valuable code?

**Sota is the antidote.**

We believe that code should be simple, explicit, and centered around the domain. We replace complex class hierarchies and dependency injection magic with a straightforward, functional approach that is easy to understand, test, and maintain.

## The Sota Philosophy

1.  **Functions Over Classes:** All application logic—from use cases to adapters—is expressed as functions. This drastically reduces boilerplate and cognitive overhead.
2.  **Rich Domain Models:** Your domain objects should be smart. Sota guides you to create rich, encapsulated Aggregates that own their own business rules, putting an end to anemic models.
3.  **Explicit Dependencies:** We replace implicit, decorator-based DI with a simple `usePort` hook. A function's dependencies are declared at the top, making the code transparent and easy to trace.
4.  **Testability by Design:** The functional core and explicit dependencies make testing a first-class citizen, not an afterthought. Mocking is as simple as providing a different function.

## Why Sota?

-   **Liberating Simplicity:** No more `@Injectable()`, `modules`, or `providers`. Your business logic is the star of the show, not the framework's ceremony.
-   **Truly Decoupled Architecture:** Sota's Port & Adapter pattern isn't just a suggestion; it's the foundation. Your domain is naturally isolated from infrastructure like databases and APIs.
-   **Fearless Testing:** Test your entire business flow in complete isolation from the outside world. Achieve 100% confidence in your logic before you write a single line of infrastructure code.
-   **Scalable by Nature:** The clean separation of concerns makes it easy to scale, maintain, and evolve your application over time.

---

## The Workflow: Inside-Out Development

Sota encourages an "inside-out" development process that puts your business logic first.

1.  **Define the Use Case (The Orchestrator):** Start by defining the public entry point to your feature. A Use Case is a simple function that orchestrates the flow of logic. It doesn't contain business rules itself; instead, it coordinates the interaction between the domain model (where the rules live) and the necessary ports (e.g., for database persistence).

2.  **Model the Domain (The Pure Business Logic):** This is where you create the heart of your application: pure, testable business logic that is completely independent of any framework or infrastructure. You build rich Aggregates that encapsulate and enforce your business rules, ensuring your core logic is robust and easy to verify.

3.  **Test in Isolation:** Write unit tests that verify your business logic against mock ports.

4.  **Implement Adapters:** Only after your business logic is proven correct, write the infrastructure code that connects your application to the real world.

For a complete, step-by-step guide, see our primary implementation document:
-   **[Implementation Workflow: Building a Hexagon in Sota](./docs/implementation-workflow.md)**

## Dive Deeper

-   **[Domain Modeling in Sota](./docs/docs/domain-modeling.md)**: Learn how to create rich, robust domain models.
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
