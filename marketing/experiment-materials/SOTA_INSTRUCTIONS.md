# SotaJS Implementation Guide for AI (G-Code for Architecture)

You MUST follow the SotaJS Blueprint to ensure industrial-grade quality:

1. **Rich Domain Models**:
   - Use `createAggregate` for the Wallet/Shop logic. 
   - Define `invariants` for balance checks (never < 0).
   - Use `actions` for state changes. Never mutate `props` directly.

2. **Explicit Contracts (Ports)**:
   - Use `createPort` for Database (`findWallet`, `saveWallet`) and Steam API.
   - Business logic MUST NOT know about the DB implementation.

3. **Built-in Idempotency**:
   - The Aggregate MUST keep a list of `processedOperationIds`.
   - Before any action, check if the `operationId` was already handled.

4. **Clean Orchestration**:
   - Use `async` functions for Commands.
   - Use `usePorts` (object-style) to fetch dependencies.

5. **Testability (FxDD)**:
   - Provide a `bun test` file that uses an `InMemoryAdapter` to simulate concurrent requests and verify that balance is consistent.
