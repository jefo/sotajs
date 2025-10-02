# Changelog

## 0.4.0 (2025-10-02)

### Features

- **Core & DI Refactor**: Introduced a new, more robust way to structure applications using Features and a Core container.
  - `defineFeature()`: New function to group related ports into a single, cohesive feature contract.
  - `defineCore()`: New function to define the application's core by composing features.
  - `core.bindFeatures()`: New method for holistically binding a feature's entire port contract to a single adapter class, ensuring all ports are implemented.
- **`createPort` Simplification**: The `createPort` function has been simplified. It is no longer necessary to wrap the return type in a `Promise`. The framework now handles this automatically, leading to cleaner port definitions.

### Bug Fixes

- **Action Typings**: Fixed a TypeScript issue in `createEntity` where action signatures incorrectly exposed the internal `state` parameter. Public-facing actions now have the correct signature, omitting the `state` argument as intended.
