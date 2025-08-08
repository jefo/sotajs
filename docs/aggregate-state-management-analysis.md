# Analysis of State Management Models for Sota Aggregates

**Document ID:** SOTA-ARCH-001  
**Version:** 1.0  
**Status:** DRAFT

## 1.0 Purpose

This document provides a formal analysis of candidate architectures for managing the state of Aggregates within the Sota framework. The objective is to select a model that is robust, testable, scalable, and aligns with the core principles of Sota (SOLID, functional programming, developer experience).

This analysis follows the principles of Model-Based Systems Engineering (MBSE) to ensure that the final decision is traceable to stakeholder needs and formal requirements.

## 2.0 Stakeholder Needs Analysis

The primary stakeholder is the **Application Developer** using the Sota framework. Their needs when working with domain aggregates are as follows:

| Need ID | Stakeholder Need                                                                 |
| :------ | :------------------------------------------------------------------------------- |
| **N-01**  | I need to be certain that the business rules (invariants) of an aggregate are **never** bypassed. |
| **N-02**  | I need to easily test the aggregate's business logic in **complete isolation** from infrastructure (e.g., databases). |
| **N-03**  | I need the state changes to be **easy to understand and debug**.                         |
| **N-04**  | I need a clear and reliable way to perform **side effects** (like saving to a database or sending an event) **after** a state change is successfully committed. |
| **N-05**  | I need the system to be **performant** and not load unnecessary data into memory.      |
| **N-06**  | I need a way to add **cross-cutting concerns** (like logging or auditing) to the business logic without modifying it directly. |

## 3.0 System Requirements

From the stakeholder needs, we derive the following formal system requirements:

| Req. ID  | Requirement Statement                                                                                             |
| :------- | :---------------------------------------------------------------------------------------------------------------- |
| **REQ-01** | The state of an aggregate shall be **immutable**.                                                                   |
| **REQ-02** | The state of an aggregate shall only be modifiable through a set of **explicitly defined operations** (methods).      |
| **REQ-03** | The core business logic within these operations shall be implemented as **pure functions**.                         |
| **REQ-04** | The system shall provide a mechanism to **inject dependencies** (ports) into the business logic for testing.        |
| **REQ-05** | The system shall provide a mechanism to **trace or audit** state transitions.                                     |
| **REQ-06** | The system shall provide a mechanism to reliably execute **side-effect functions** after a state mutation is complete. |
| **REQ-07** | The state management model shall **not require a global state container** holding all active aggregates.            |
| **REQ-08** | The system shall provide an extension point for **middleware** to intercept operations.                             |

## 4.0 Traceability Matrix (Needs to Requirements)

| Need ID | REQ-01 (Immutable) | REQ-02 (Explicit Ops) | REQ-03 (Pure Logic) | REQ-04 (DI) | REQ-05 (Trace) | REQ-06 (Side Effect) | REQ-07 (No Global) | REQ-08 (Middleware) |
| :------ | :----------------: | :-------------------: | :-----------------: | :---------: | :------------: | :------------------: | :----------------: | :-----------------: |
| **N-01**  |         ✓          |           ✓           |          ✓          |             |                |                      |                    |                     |
| **N-02**  |         ✓          |           ✓           |          ✓          |      ✓      |                |                      |                    |                     |
| **N-03**  |         ✓          |           ✓           |                     |             |       ✓        |                      |                    |          ✓          |
| **N-04**  |                    |                       |                     |             |                |          ✓           |                    |          ✓          |
| **N-05**  |                    |                       |                     |             |                |                      |         ✓          |                     |
| **N-06**  |                    |                       |                     |             |       ✓        |                      |                    |          ✓          |

## 5.0 Analysis of Candidate Architectures

We will analyze two primary architectural patterns inspired by modern frontend state management libraries.

### 5.1 Candidate A: Centralized State Tree (Redux-like)

In this model, the state of all active aggregates is held in a single, global, immutable state tree. State changes are initiated by dispatching "actions" which are processed by pure "reducer" functions.

-   **How it works:** A `Store` holds the state. A use case would `dispatch({ type: 'order/addItem', payload: {...} })`. A central reducer would find the correct order aggregate in the state tree and apply the update, returning a new state tree.
-   **Pros:** Excellent traceability (single action log), mature middleware pattern.
-   **Cons:** High memory overhead, complex for a server-side request/response model (managing concurrent requests modifying the same global state is very difficult), and feels unnatural for object-oriented aggregates.

### 5.2 Candidate B: Decentralized Atomic State (Zustand/Jotai-like)

In this model, each aggregate instance *is its own store*. It encapsulates its own state and the methods to change it. There is no global container.

-   **How it works:** An aggregate is loaded from the database and an instance is created. This instance holds its state. The use case calls methods directly on this instance (e.g., `order.addItem(...)`). The method contains the business logic and updates the internal state.
-   **Pros:** Simple, low memory overhead, aligns perfectly with object-oriented principles and DDD aggregates. Concurrency is simple to manage as each request handles its own isolated aggregate instance.
-   **Cons:** Middleware and traceability are less trivial to implement than in the centralized model, but still achievable.

## 6.0 Comparative Analysis

| Requirement | Candidate A (Centralized) | Candidate B (Decentralized) | Justification for Winner |
| :--- | :--- | :--- | :--- |
| **REQ-01: Immutable** | ✓ (Fully) | ✓ (Fully) | **Tie.** Both models are predicated on immutability. |
| **REQ-02: Explicit Ops** | ✓ (Fully) | ✓ (Fully) | **Tie.** A: Reducers, B: Methods. Both are explicit. |
| **REQ-03: Pure Logic** | ✓ (Fully) | ✓ (Fully) | **Tie.** Both models require pure functions for state transitions. |
| **REQ-04: DI for Tests** | ✗ (Partially) | ✓ (Fully) | **Winner: B.** Decentralized model aligns perfectly with Sota's `usePort` for injecting dependencies into methods. Centralized model makes injecting dependencies into global reducers awkward. |
| **REQ-05: Traceability** | ✓ (Fully) | ✓ (Partially) | **Winner: A.** Centralized action log is superior for auditing. However, B can achieve good-enough tracing with method decorators or proxies. |
| **REQ-06: Side Effects** | ✓ (Fully) | ✓ (Fully) | **Tie.** A: Middleware (e.g., thunks/sagas). B: Simple `await` call in the use case after the method completes. Both are effective. |
| **REQ-07: No Global State** | ✗ (No) | ✓ (Fully) | **Winner: B.** This is a critical requirement for a scalable, performant backend. The centralized model fails here. |
| **REQ-08: Middleware** | ✓ (Fully) | ✓ (Partially) | **Winner: A.** The Redux middleware pattern is more mature. B can achieve this via function composition or decorators, but it's less conventional. |

## 7.0 Conclusion & Recommended Architecture

While the Centralized model offers superior out-of-the-box traceability and middleware, it fundamentally fails **REQ-07 (No Global State)**, which is a non-negotiable requirement for a server-side framework managing concurrent requests.

The **Decentralized Atomic State (Zustand/Jotai-like) model** is the clear winner. It fully satisfies the most critical requirements, aligns perfectly with the principles of Domain-Driven Design (an aggregate *is* a consistency boundary), and naturally integrates with Sota's existing functional, hook-based dependency injection.

**Therefore, the recommended architecture is Decentralized Atomic State.**

## 8.0 Proposed Implementation Sketch

We will create a helper function, `createAggregate`, that encapsulates the chosen pattern.

```typescript
import { z } from 'zod';

// The user provides a Zod schema and a factory for their business logic methods.
export function createAggregate<TProps extends { id: string }>(
  schema: z.ZodType<TProps>,
  methodsFactory: (props: TProps) => Record<string, (...args: any[]) => void>
) {
  return class Aggregate {
    private props: TProps;

    private constructor(props: TProps) {
      this.props = props;
    }

    // Public, read-only access to state
    get state(): Readonly<TProps> {
      return this.props;
    }

    // The only way to create an instance, ensuring validation
    public static create(initialData: unknown): Aggregate {
      return new Aggregate(schema.parse(initialData));
    }

    // The business logic methods, bound to the instance
    public readonly methods = methodsFactory(this.props);
  };
}
```
