# Domain Modeling in Sota: From Anemic Models to Rich Aggregates

This document provides a practical guide to Domain-Driven Design (DDD) within the Sota framework. It is specifically written for developers who may be accustomed to anemic domain models and want to understand how to build rich, robust, and maintainable systems.

## The Problem with Anemic Models

Many systems are built using an **anemic domain model**. In this style, domain objects are simple data structures (often called DTOs or POJOs/POCOs) with no business logic. All logic for manipulating these objects resides in external "service" or "manager" classes.

**The Anemic Way (Before):**

```typescript
// The Order object is just a bag of properties
interface Order {
  id: string;
  status: 'pending' | 'paid' | 'shipped';
  items: any[];
}

// All logic lives in a separate service
class OrderService {
  public shipOrder(order: Order) {
    // Business rules are scattered and not owned by the data
    if (order.status !== 'paid') {
      throw new Error('Order must be paid before shipping.');
    }
    order.status = 'shipped';
    // ... database logic to save the order
  }
}
```

This approach leads to several problems:
- **Scattered Logic:** Business rules are spread across various services, making them hard to find and maintain.
- **No Invariants:** The `Order` object cannot protect its own state. Any part of the system can set `status` to an invalid value or in an incorrect sequence.
- **Anemic = Not Object-Oriented:** It's a procedural approach that misses the core benefit of OO: the encapsulation of data and the processes that operate on that data.

## The Solution: Rich Domain Models & Aggregates

Sota champions the **rich domain model** approach. Here, data and the logic that operates on it are encapsulated within the same object. The central pattern for this is the **Aggregate**.

An **Aggregate** is a cluster of domain objects (Entities and Value Objects) that can be treated as a single unit. It acts as a **transactional consistency boundary**. This means that within a single transaction, all business rules (invariants) for the entire aggregate must be satisfied.

Key components:
- **Aggregate Root:** The single entry point to the aggregate. It's an entity that is responsible for loading the aggregate and enforcing its invariants.
- **Entity:** An object with a distinct identity (ID) that persists over time.
- **Value Object (VO):** An immutable object defined by its attributes, like `Money` or `Address`.

## Best Practices for Implementing Aggregates in Sota

Here is the canonical way to implement an Aggregate in Sota.

### 1. Define the Properties Schema with `zod`

Start by defining the shape and basic validation rules for your aggregate's data using a `zod` schema. This schema defines the `props` of your aggregate.

```typescript
// domain/order/order.schema.ts
import { z } from 'zod';

export const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
});

export const OrderPropsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'shipped', 'cancelled']),
  items: z.array(OrderItemSchema),
  createdAt: z.date(),
});

// Export the inferred type for convenience
export type OrderProps = z.infer<typeof OrderPropsSchema>;
```

### 2. Create the Aggregate Class

Next, create a class for the aggregate. Its primary role is to hold the properties and expose methods that implement business logic.

- The constructor is **private**. This is critical. It forces all instantiation to go through a controlled factory method, ensuring no aggregate can be created in an invalid state.
- It holds its state in a private `props` object.

```typescript
// domain/order/order.aggregate.ts
import { OrderProps, OrderPropsSchema } from './order.schema';

export class Order {
  private readonly props: OrderProps;

  private constructor(props: OrderProps) {
    this.props = props;
  }

  // Getters to expose state in a controlled, read-only way
  get id(): string { return this.props.id; }
  get status(): string { return this.props.status; }
  get items() { return [...this.props.items]; // Return a copy to prevent mutation }
}
```

### 3. Use a Static `create()` Factory Method

This is the **only public way** to create a new instance of your aggregate. It takes raw data, validates it against the `zod` schema, and then returns a new, valid instance.

```typescript
// Inside the Order class

public static create(initialData: unknown): Order {
  // 1. Validate the input against the schema
  const props = OrderPropsSchema.parse(initialData);
  
  // 2. If valid, create a new instance
  return new Order(props);
}
```

### 4. Encapsulate Business Logic in Methods

Instead of a `OrderService`, add methods directly to the `Order` class. These methods contain the business rules (invariants) and are the only way to modify the aggregate's state.

```typescript
// Inside the Order class

public pay(): void {
  if (this.props.status !== 'pending') {
    throw new Error('Only pending orders can be paid.');
  }
  this.props.status = 'paid';
}

public ship(): void {
  if (this.props.status !== 'paid') {
    throw new Error('Order must be paid before it can be shipped.');
  }
  this.props.status = 'shipped';
}

public addItem(item: { productId: string; quantity: number; price: number }): void {
  if (this.props.status !== 'pending') {
    throw new Error('Items can only be added to pending orders.');
  }
  // You can add more complex logic, e.g., checking for duplicates
  this.props.items.push(item);
}
```

## Modeling Semantic Relationships

Modeling relationships between different domain objects is crucial, but it's also a common source of architectural pitfalls. While it might seem intuitive to embed references directly within an Aggregate's schema, this can quickly lead to the "God Aggregate" anti-pattern and other significant problems.

For a detailed explanation of the **naive approach** and the problems it creates (such as violating the Single Responsibility Principle, performance bottlenecks, and complex actions), please refer to: 
- **[Anti-Pattern: Naive Semantic Relationships](./anti-patterns/naive-semantic-relationships.md)**

### The Core Principle: Reference by ID

To preserve the integrity of Aggregate boundaries and avoid tight coupling, **Aggregates should only reference other Aggregates by their unique ID, not by direct object references.** This rule applies whether the referenced object is an Aggregate Root itself or an Entity that serves as an Aggregate Root.

Within a single Aggregate, direct object references between its internal Entities and Value Objects are permissible, as the Aggregate Root is responsible for managing their lifecycle and ensuring their consistency.

### Using `createBrandedId` for Type Safety

Our `createBrandedId` utility is essential for implementing these ID-based references with strong type safety. It ensures that you cannot accidentally assign a `UserId` where an `OrderId` is expected.

### Types of Relationships and Their Implementation

Modeling relationships between different domain objects is crucial, but it's also a common source of architectural pitfalls. As discussed in [Anti-Pattern: Naive Semantic Relationships](./anti-patterns/naive-semantic-relationships.md), simply embedding all references within a single Aggregate can lead to the "God Aggregate" problem.

For complex, cross-domain relationships, especially between independent Aggregates, a more sophisticated strategy is required. This is where the **Relationship Aggregate** pattern comes into play.

#### Pattern: Relationship Aggregate

Instead of embedding references directly into the participating Aggregates, the relationship itself becomes a first-class citizen of the domain, modeled as its own Aggregate. This new Aggregate (the "Relationship Aggregate") is responsible for managing the lifecycle and invariants of the connection between two or more other Aggregates/Entities.

**Key Characteristics:**

-   **Dedicated Aggregate:** The relationship (e.g., `RequirementDerivation`, `TestCaseSatisfaction`) is an Aggregate Root itself.
-   **Manages Participating Entities' Properties:** Its schema contains the `BrandedId`s of the Aggregates/Entities it connects, **along with the actual instances of those entities (or their relevant properties) that must be updated symmetrically and atomically with the relationship itself.** This means the Relationship Aggregate directly holds and modifies the properties of the participating entities that define the link.
-   **Encapsulated Logic:** All business rules pertaining to the relationship (e.g., a `Requirement` can only be derived from a `Requirement` of a higher level) are enforced within this Relationship Aggregate's actions and invariants.
-   **Atomic Operations:** Operations on the *relationship itself* (e.g., creating a link, breaking a link) and the symmetric updates of participating entities' properties are **atomic within the boundary of this Relationship Aggregate**. When this Aggregate is saved via its repository, the repository ensures all these changes are persisted atomically.

**Benefits:**

-   **Adherence to SRP:** The responsibility for managing the relationship and its immediate, symmetrically updated properties is clearly separated.
-   **Strong Consistency:** Guarantees atomicity for the relationship and its directly managed properties.
-   **Clear Boundaries:** Reinforces the independent consistency boundaries of the participating Aggregates for *their other properties*.
-   **Flexibility:** Allows relationships to have their own properties and lifecycle.

##### Example: Requirement Derivation (1:M Relationship via Relationship Aggregate)

Let's model the relationship where a `Requirement` can derive from another `Requirement`, and a `Requirement` can have multiple derived `Requirement`s. Both `Requirement` and `DerivedRequirement` are independent Entities (which might be part of larger Aggregates, or be Aggregate Roots themselves).

We introduce a new Relationship Aggregate: `RequirementDerivation`.

```typescript
// domain/requirement/requirement.entity.ts (Illustrative - simplified)
import { z } from 'zod';
import { createEntity } from '@sota/core'; // Assuming createEntity is available
import { RequirementId } from './requirement.ids'; // Assuming BrandedId

export const RequirementSchema = z.object({
  id: RequirementId.schema,
  text: z.string(),
  derives: z.array(RequirementId.schema).default([]), // IDs of requirements this one derives
  derivedFrom: RequirementId.schema.optional(), // ID of requirement this one is derived from
});

type RequirementProps = z.infer<typeof RequirementSchema>;

export const Requirement = createEntity({
  schema: RequirementSchema,
  actions: {
    // Actions to manage its own internal state, not direct relationship updates
    addDerived: (state: RequirementProps, derivedId: RequirementId) => {
      return { ...state, derives: [...state.derives, derivedId] };
    },
    setDerivedFrom: (state: RequirementProps, parentId: RequirementId) => {
      return { ...state, derivedFrom: parentId };
    },
  },
});

export type Requirement = InstanceType<typeof Requirement>;

// domain/requirement-derivation/requirement-derivation.schema.ts
import { z } from 'zod';
import { RequirementId } from '../requirement/requirement.ids';
import { RequirementSchema } from '../requirement/requirement.entity'; // Import the full entity schema

export const RequirementDerivationSchema = z.object({
  id: z.string().uuid(), // ID of the derivation link itself
  parentRequirement: RequirementSchema, // Full instance of the parent Requirement entity
  childRequirement: RequirementSchema,   // Full instance of the child Requirement entity
});

type RequirementDerivationState = z.infer<typeof RequirementDerivationSchema>;

// domain/requirement-derivation/requirement-derivation.aggregate.ts
import { createAggregate } from '@sota/core';
import { RequirementDerivationSchema, RequirementDerivationState } from './requirement-derivation.schema';

export const RequirementDerivation = createAggregate({
  name: 'RequirementDerivation',
  schema: RequirementDerivationSchema,
  invariants: [
    (state) => {
      if (state.parentRequirement.id.equals(state.childRequirement.id)) {
        throw new Error('Requirement cannot derive from itself.');
      }
    },
  ],
  actions: {
    // This action directly modifies the nested Requirement entities' properties
    establishDerivation: (state: RequirementDerivationState) => {
      // Update parent's 'derives' list
      state.parentRequirement.actions.addDerived(state.childRequirement.id);
      // Update child's 'derivedFrom' property
      state.childRequirement.actions.setDerivedFrom(state.parentRequirement.id);
      
      // Return the updated state of the Relationship Aggregate
      return { state: state }; // State is already updated by nested actions
    },
  },
});

export type RequirementDerivation = InstanceType<typeof RequirementDerivation>;
```

**How Atomicity and Symmetry are Achieved:**

1.  **Atomicity:** The `establishDerivation` action on `RequirementDerivation` is atomic. It directly modifies the properties of the nested `Requirement` entities *within its own state*. When this `RequirementDerivation` Aggregate is saved via its repository, the repository ensures all these changes (to the derivation link itself and to the `derives`/`derivedFrom` properties of the participating `Requirement` entities) are persisted atomically to the underlying storage.

2.  **Symmetry:** The symmetric update of properties (`derives` on parent, `derivedFrom` on child) is handled directly by the `actions` of the `RequirementDerivation` Aggregate. This ensures that the relationship and these specific properties are always consistent together.

This pattern provides a robust and scalable way to manage complex semantic relationships in a DDD-compliant manner, adhering to Aggregate boundaries and SOLID principles. It centralizes the consistency of the relationship and its directly managed properties, relying on the repository to handle the atomic persistence. It centralizes the consistency of the relationship and its directly managed properties, relying on the repository to handle the atomic persistence.

## Rules for Aggregate Interaction

To maintain loose coupling and clear boundaries, follow these three critical rules.

1.  **Reference Other Aggregates by ID Only**

    An `Order` aggregate needs to know about a `User`, but it should **only store the `userId`**, not the entire `User` aggregate object. 

    - **Why?** Loading a `User` object every time you load an `Order` is inefficient. More importantly, it creates tight coupling between the two aggregates. If you need user details, you use the `userId` to fetch them in a separate step, typically within a use case.

2.  **Modify Only One Aggregate per Transaction**

    Each transaction should only ever create or modify a single aggregate instance. 

    - **Why?** This rule simplifies transaction management and avoids complex distributed transaction scenarios. If a business process needs to update multiple aggregates (e.g., a customer placing an order should also update their "loyalty points"), this is orchestrated at the use case layer, often using domain events.

3.  **Segregate Read and Write Ports (CQRS)**

    To protect your aggregate's invariants, you must treat read and write operations differently at the port level.

    - **Write Ports (Commands):** These ports (`save`, `update`, `delete`) **must always** operate on the full Aggregate Root. This is the only way to guarantee that all business rules and invariants are checked before the state is changed.
      ```typescript
      // A write port ALWAYS takes the full aggregate
      export const saveOrderPort = createPort<(order: Order) => Promise<void>>();
      ```

    - **Read Ports (Queries):** These ports are more flexible. You are free to create ports that return whatever data shape is most efficient for a given use case. This can be:
        - The full Aggregate Root: `findOrderByIdPort`
        - A specific Entity within an aggregate: `findOrderItemByIdPort`
        - A custom, read-optimized DTO: `findOrderSummaryPort`

    - **Why?** This Command-Query Responsibility Segregation (CQRS) approach provides both safety for writes and performance/flexibility for reads.

By following these principles, you create a domain model that is robust, expressive, and a true reflection of your business processes. Your code becomes easier to understand, maintain, and test.
