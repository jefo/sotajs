# SotaJS Framework: Future Improvements Todo

This document lists potential improvements and new concepts for future versions of the SotaJS framework.

## 1. Evolve Dependency Injection with "Modules" ✅ COMPLETED

**Concept:** Instead of multiple `usePort()` calls for every dependency in a use case, introduce a "Module" concept to group related ports.

**Implementation:**
```typescript
// Define a module that groups ports
export const orderPorts = createModule({
    findUser: findUserPort,
    saveOrder: saveOrderPort,
    sendEmail: sendEmailPort
});

// Use the module in the use case
const { findUser, saveOrder, sendEmail } = useModule(orderPorts);
```

**Benefits:**
- Reduces boilerplate and noise in use cases.
- Encourages better organization of dependencies into logical groups.
- Maintains explicitness without introducing "magic".

---

## 2. Differentiate Queries and Commands (CQRS-like approach)

**Concept:** The current Use Case pattern (fire-and-forget with Output Ports) is excellent for **Commands** but can be verbose for simple **Queries**. Introduce a new, simpler pattern for queries.

**Current (for a query):**
Requires defining multiple output ports and adapters just to get data back.

**Proposed:**
Introduce a `createQuery` factory for simple `async` functions that can **return a value directly** or throw a specific error.

```typescript
const getUserQuery = async ({ id }: { id: string }) => {
    const findUserById = usePort(findUserByIdPort);
    const user = await findUserById({ id });

    if (!user) {
        throw new NotFoundError('User not found');
    }
    return user; // Directly return the data
};
```

**Benefits:**
- **Pragmatism:** Greatly simplifies simple data-retrieval operations.
- **CQRS Alignment:** Creates a clear conceptual separation between state-changing Commands and data-reading Queries.
- **Reduced Boilerplate:** Eliminates the need for output ports for simple queries.

---

## 3. Improve Domain Object Ergonomics with Direct Method Access

**Concept:** Make the API for interacting with domain objects more natural by attaching action methods directly to the instance.

**Current:**
```typescript
const order = Order.create(...);
order.actions.pay('credit-card');
```

**Proposed:**
Modify `createAggregate` and `createEntity` to attach actions directly to the prototype of the instance.

```typescript
const order = Order.create(...);
order.pay('credit-card'); // Feels more natural
```

**Benefits:**
- **Ergonomics:** More intuitive and closer to standard OO practices.
- **Cleaner Code:** Reduces the `actions.` prefix, making the code that uses domain objects more readable.
- **Trade-off:** Slightly blurs the explicit separation of `state` and `actions`. This can be mitigated by checking for name collisions at creation time.
