# SotaJS Quick Reference

## Core Patterns

### 1. Aggregate Pattern

```typescript
const MyAggregate = createAggregate({
  name: 'MyAggregate',
  schema: MySchema,
  invariants: [
    (state) => {
      // Business rules - throw errors if violated
    }
  ],
  actions: {
    myAction: (state, payload) => {
      // Validate preconditions
      // Return { state: newState, event: optionalEvent }
    }
  }
});
```

### 2. Use Case Pattern

```typescript
const myUseCase = async (input: unknown) => {
  // 1. Validate input
  const validInput = MyInputSchema.parse(input);
  
  // 2. Declare dependencies
  const port = usePort(myPort);
  
  // 3. Orchestrate domain logic
  const result = await port(validInput);
  
  // 4. Return output
  return result;
};
```

### 3. Port & Adapter Pattern

```typescript
// Port definition
const myPort = createPort<(dto: MyDto) => Promise<MyResult>>();

// Adapter implementation
const myAdapter = async (dto: MyDto) => {
  // Implementation details
  return result;
};

// Binding
setPortAdapter(myPort, myAdapter);
```

## Development Workflow

1. **Define Use Case**
   - Create input/output schemas with Zod
   - Declare required ports with `usePort`

2. **Model Domain**
   - Create aggregates with `createAggregate`
   - Define entities and value objects
   - Establish invariants and actions

3. **Write Tests**
   - Mock ports with `setPortAdapter`
   - Reset DI container with `resetDI`
   - Test use cases as pure functions

4. **Implement Infrastructure**
   - Create real adapters for ports
   - Bind in composition root

## Key Principles

- **One transaction, one aggregate**
- **Reference aggregates by ID only**
- **Separate read/write ports (CQRS)**
- **All ports accept single DTO parameter**
- **Business logic in domain, orchestration in use cases**

## Testing

```typescript
beforeEach(() => {
  resetDI();
  setPortAdapter(myPort, mockAdapter);
});

it('should work correctly', async () => {
  // Test the use case with mocked dependencies
});
```

## API Layer

```typescript
const handler = createApiHandler(myUseCase);
// Use with framework adapter (e.g., toExpress)
```