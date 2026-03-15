# GEMINI.md - SotaJS Project Context

## Project Overview
**SotaJS (Сота)** is a functional, TypeScript-driven framework for building applications using **Hexagonal Architecture**, **Domain-Driven Design (DDD)**, and **CQRS** principles. It emphasizes rich domain models, explicit dependency injection via hooks, and platform-agnostic business logic.

### Core Technologies
- **Runtime & Test Runner:** [Bun](https://bun.sh) (v1.1.5+)
- **Language:** TypeScript (v5.0.0+)
- **Validation:** [Zod](https://zod.dev)
- **Immutability:** [Immer](https://immerjs.github.io/immer/)
- **DI Internal:** [BottleJS](https://github.com/young-steveo/bottlejs)

## Architecture & Concepts
SotaJS follows a strict separation of concerns:
1. **Rich Domain Models:**
   - **Aggregates:** Transactional boundaries, created via `createAggregate`. Encapsulate invariants and actions.
   - **Entities:** Objects with identity and lifecycle, created via `createEntity`.
   - **Value Objects:** Immutable, attribute-defined objects, created via `createValueObject`.
2. **Ports & Adapters:**
   - **Ports:** Abstract contracts for external dependencies (e.g., database, logger), created with `createPort`.
   - **Adapters:** Concrete implementations of ports (e.g., Prisma, ConsoleLogger).
3. **Dependency Injection (DI):**
   - Hook-based DI using `usePort`, `usePorts`, and `useModule`.
   - **Features:** Groupings of ports (`defineFeature`).
   - **Core:** The application entry point (`defineCore`) where features are bound to adapters.
4. **CQRS:**
   - **Commands:** Use cases that change state.
   - **Queries:** Use cases that read data.

## Building and Running

### Installation
```bash
bun install
```

### Running the Project (Examples/Playground)
```bash
bun run index.ts
```

### Testing
SotaJS uses Bun's built-in test runner.
```bash
bun test
```
Tests are located alongside source files (e.g., `lib/*.test.ts`).

### Building for Distribution
```bash
npm run build
# OR
tsc -p tsconfig.build.json
```

## Development Conventions
- **Functional First:** Prefer `async` functions (Use Cases) over class-based services.
- **Explicit Dependencies:** Always use `usePort` or `usePorts` at the top of Use Cases.
- **Rich Models:** Business logic belongs in Aggregates and Value Objects, not in "Anemic" Services.
- **Surgical Updates:** When modifying the core, maintain type safety and follow the established `create*` factory patterns.
- **Testing:** Every new feature or bug fix MUST include a corresponding `*.test.ts` file or update existing ones.

## Key Files & Directories
- `lib/`: Core framework implementation.
  - `aggregate.ts`, `entity.ts`, `value-object.ts`: Domain model factories.
  - `core.ts`, `feature.ts`, `di.v2.ts`: Dependency injection and orchestration.
  - `ports/`, `adapters/`: Built-in port contracts and base adapters.
- `docs/`: Comprehensive Russian and English documentation.
  - `README.md`: Main architecture guide.
  - `cqrs-integration.md`: CQRS patterns and integration.
- `package.json`: Dependency and script definitions.
- `index.ts`: Framework entry point.
