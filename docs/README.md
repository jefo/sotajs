# SotaJS Documentation Overview

This is a consolidated overview of the SotaJS framework documentation. For detailed information, please refer to the full documentation.

## Table of Contents

1. [Framework Overview](./consolidated-framework-docs.md) - Core architecture and concepts
2. [Use Case Driven Development](./consolidated-framework-docs.md#development-process) - The SotaJS development workflow
3. [Domain Modeling](./consolidated-framework-docs.md#core-concepts) - Aggregates, Entities, and Value Objects
4. [Dependency Injection](./consolidated-framework-docs.md#dependency-injection) - Ports and Adapters pattern
5. [Testing](./consolidated-framework-docs.md#testing-philosophy) - Integration testing approach

## Key Features

- **Architecture Enforcement**: SotaJS enforces clean architecture principles
- **Functional Approach**: Uses functional programming patterns with React-like hooks
- **Test-Driven**: Emphasizes integration testing with mocked dependencies
- **Framework Agnostic**: Core logic is decoupled from delivery mechanisms
- **Type Safety**: Leverages TypeScript for robust type checking

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Bun (with fallback to Node.js)
- **Validation**: Zod for schema validation
- **Testing**: Bun:test (or compatible test runner)
- **DI Container**: Custom implementation based on Ports & Adapters

## Getting Started

1. Define your use cases first
2. Model your domain with aggregates, entities, and value objects
3. Create ports for external dependencies
4. Write integration tests with mocked ports
5. Implement adapters for real infrastructure
6. Bind adapters in the composition root

For detailed implementation examples and code patterns, see the full documentation.
