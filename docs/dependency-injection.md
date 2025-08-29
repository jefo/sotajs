# Dependency Injection in SotaJS

The dependency injection (DI) system in SotaJS is based on the **Ports and Adapters** (Hexagonal Architecture) pattern. It allows for a clean separation between your application's core logic and its external dependencies (like databases, APIs, etc.).

- **Port**: A port is a formal definition of an interface or a "contract". It specifies *what* a piece of functionality does, but not *how* it does it.
- **Adapter**: An adapter is the concrete implementation of a port. It provides the actual logic for the contract defined by the port.

The entire system is designed to be type-safe and to leverage TypeScript's inference capabilities.

---

## Core Functions

### 1. `createPort<T>()`

This function defines a new port. The generic `T` must be a function signature.

- **Usage**: `createPort<TYPE>()`
- **Example**:
  ```typescript
  // in domain/ports/logger.port.ts
  type LogFn = (message: string) => void;
  export const loggerPort = createPort<LogFn>();
  ```
  This creates a key for the DI container that is associated with the function signature `(message: string) => void`.

### 2. `setPortAdapter(port, adapter)`

This function binds a concrete implementation (an adapter) to a previously defined port.

- **Usage**: `setPortAdapter(myPort, myAdapter)`
- **Example**:
  ```typescript
  // in infrastructure/console-logger.adapter.ts
  const consoleLoggerAdapter = (message: string) => {
    console.log(`[LOG]: ${message}`);
  };

  // in composition-root.ts
  import { loggerPort } from "../domain/ports/logger.port.ts";
  import { consoleLoggerAdapter } from "../infrastructure/console-logger.adapter.ts";

  setPortAdapter(loggerPort, consoleLoggerAdapter);
  ```

### 3. `usePort(port)`

This function retrieves the implementation of a port from the DI container. This is how your application logic consumes dependencies without being coupled to their concrete implementations.

- **Usage**: `usePort(myPort)`
- **Example**:
  ```typescript
  // in application/use-cases/some.use-case.ts
  import { loggerPort } from "../../domain/ports/logger.port.ts";

  function myUseCase() {
    const log = usePort(loggerPort); // log is now correctly typed as (message: string) => void
    log("Executing my use case!");
  }
  ```

---

## Complete Example

```typescript
// 1. Define the Port (the contract)
// ports/greeter.port.ts
import { createPort } from "@sota/core/di.v2";
export const greeterPort = createPort<(name: string) => string>();


// 2. Create an Adapter (the implementation)
// adapters/console-greeter.adapter.ts
export const consoleGreeterAdapter = (name: string): string => {
    return `Hello, ${name}!`;
};


// 3. Bind them in the Composition Root
// composition-root.ts
import { setPortAdapter } from "@sota/core/di.v2";
import { greeterPort } from "./ports/greeter.port";
import { consoleGreeterAdapter } from "./adapters/console-greeter.adapter";

setPortAdapter(greeterPort, consoleGreeterAdapter);


// 4. Use the Port in your application
// use-cases/greet-user.use-case.ts
import { usePort } from "@sota/core/di.v2";
import { greeterPort } from "../ports/greeter.port";

export function greetUserUseCase(name: string) {
    const greet = usePort(greeterPort);
    const message = greet(name);
    console.log(message); // Outputs: "Hello, John!"
}
```

---

## Best Practices

- **Single Composition Root**: All calls to `setPortAdapter` should be in a single file (e.g., `composition-root.ts`) that is executed once when the application starts. This keeps your dependency configuration centralized and clean.
- **Test Isolation**: When writing tests, call `resetDI()` in a `beforeEach` block to ensure that the DI container is cleared between tests. This prevents tests from interfering with each other.

---

## Note on the `v2` Implementation

The current DI system (`di.v2.ts`) uses a simple object as a `Port` descriptor. This provides robust and reliable type inference in TypeScript. An older implementation used a function-based `Port`, which could lead to the compiler inferring `unknown` types in complex scenarios. The `v2` system is the recommended approach.
