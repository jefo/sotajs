# Framework Architecture Model: DDD, Hexagonal, and Clean Principles

This document defines the architectural model for a framework built upon the principles of Domain-Driven Design (DDD), Hexagonal Architecture (Ports & Adapters), and Clean Architecture. The aim is to ensure a clear separation of concerns, high testability, and maintainability throughout the application lifecycle.

## Core Architectural Principles

*   **Domain-Driven Design (DDD):** Emphasizes focusing on the core business domain, using a ubiquitous language, and building rich, behavior-driven models (Aggregates, Entities, Value Objects).
*   **Hexagonal Architecture (Ports & Adapters):** Decouples the core application logic from external concerns (such as user interfaces, databases, and third-party services) by defining explicit interfaces (Ports) and providing interchangeable implementations (Adapters).
*   **Clean Architecture:** Organizes the system into concentric layers, with dependencies strictly flowing inwards. This ensures that the core business rules remain independent of external frameworks, UI, and database technologies.

## Architectural Layers & Requirements

The framework is structured into distinct layers, moving from the innermost core (Domain) to the outermost concerns (Presentation/Infrastructure). Dependencies are strictly unidirectional, always pointing inwards.

### 1. Domain Layer (Core Business Logic)

*   **Purpose:** The innermost layer, encapsulating the fundamental business rules, domain entities, value objects, and aggregates. It represents the heart of the application and must be entirely independent of all other layers.
*   **Key Components:**
    *   **Aggregates:** Clusters of domain objects that form transactional consistency boundaries, ensuring that business rules are always upheld within a single operation.
    *   **Entities:** Objects with a distinct identity that persists over time, even if their attributes change.
    *   **Value Objects:** Immutable objects defined solely by their attributes, without a unique identity.
    *   **Domain Services:** Business logic that involves multiple domain objects and doesn't naturally fit within a single Aggregate or Entity.
    *   **Domain Events:** Represent significant occurrences within the domain that other parts of the system might react to.
    *   **Domain Ports (Interfaces):** Abstract definitions of capabilities required by the domain, such as data persistence (`UserRepositoryPort`) or external validations.
*   **Requirements:**
    *   **Independence:** Must have no dependencies on any outer layers (Application, Infrastructure, Presentation).
    *   **Purity:** Business logic should be pure, deterministic, and free from side effects (where applicable), making it highly testable.
    *   **Ubiquitous Language:** All components within this layer must strictly adhere to the ubiquitous language of the business domain.
    *   **Invariants:** Aggregates must rigorously enforce their own consistency rules and business invariants.
    *   **Testability:** Components must be easily unit-testable in complete isolation, without any external dependencies.

#### Test Scenarios & Coverage

The core requirements of the Domain Layer are covered by dedicated unit tests for Aggregates, Entities, and Value Objects. These tests ensure that domain rules (invariants) are enforced and that the behavior of these core building blocks is correct and isolated.

*   **Aggregates - Invariants & Actions:**
    *   **File:** `lib/aggregate.test.ts`
    *   **Test Cases:**
        *   `should allow paying a pending order`: Demonstrates a valid state transition and event emission, confirming action correctness.
        *   `should throw if paying a non-pending order`: Verifies that invariants prevent invalid state transitions.
        *   `should throw if trying to ship an empty order`: Confirms invariant enforcement for business rules.

*   **Entities - Identity & Mutability:**
    *   **File:** `lib/entity.test.ts`
    *   **Test Cases:**
        *   `should create an entity with valid properties`: Ensures correct entity instantiation and property access.
        *   `should allow updating properties`: Validates that entity state can be updated while its unique identity remains constant.

*   **Value Objects - Immutability & Equality:**
    *   **File:** `lib/value-object.test.ts`
    *   **Test Cases:**
        *   `should create a value object with valid properties`: Confirms proper Value Object creation.
        *   `should be immutable`: Verifies that Value Objects cannot be directly modified after creation.
        *   `should be equal if all properties are equal`: Demonstrates value-based equality, a key characteristic of Value Objects.

### 2. Application Layer (Use Cases / Application Services)

*   **Purpose:** This layer defines and orchestrates the specific application use cases or features. It dictates *what* the application does in response to user actions or external events, coordinating domain objects and interacting with external systems via ports.
*   **Key Components:**
    *   **Use Cases (Application Services):** Functions or classes that encapsulate a single, atomic application feature (e.g., `CreateOrderUseCase`, `FindUserByIdUseCase`). They coordinate domain objects and interact with infrastructure via Application Ports.
    *   **Application Ports (Interfaces):** Define contracts for external capabilities required by the application layer, such as sending notifications (`NotificationServicePort`) or interacting with external APIs.
    *   **DTOs (Data Transfer Objects):** Simple data structures used for input and output of use cases, ensuring clear boundaries and data validation at the application boundary.
*   **Requirements:**
    *   **Orchestration:** Primarily responsible for orchestrating domain logic and interactions with infrastructure, not for containing business rules themselves.
    *   **Input Validation:** Must validate all incoming data (via DTOs) before passing it to the domain layer.
    *   **Transaction Management:** Manages the transactional boundaries for use cases, ensuring atomicity of operations that span multiple domain objects or persistence operations.
    *   **Dependency on Domain:** Depends only on the Domain Layer. It defines interfaces (ports) for the Infrastructure Layer but does not depend on its concrete implementations.
    *   **Testability:** Easily testable by mocking the infrastructure ports, allowing for fast and reliable integration tests of use cases.

#### Test Scenarios & Coverage

Testing of the Application Layer primarily focuses on ensuring that Use Cases correctly orchestrate domain logic and interact with external services via Ports. The testability of this layer is heavily reliant on the explicit Dependency Injection mechanism.

*   **Use Cases - Orchestration & Testability (via DI):**
    *   **File:** `lib/di.test.ts` (demonstrates the underlying DI mechanism that enables Use Case testing)
    *   **Test Cases:**
        *   `should resolve a bound adapter`: Illustrates how a Use Case successfully executes when its external dependencies (Ports) are provided with mocked adapters, confirming correct orchestration and dependency resolution.
        *   `should throw if an adapter is not bound`: Verifies that the Use Case correctly identifies and reports missing dependencies, highlighting the explicit nature of dependency management.

### 3. Infrastructure Layer (Adapters / External Services)

*   **Purpose:** This layer provides the concrete implementations (Adapters) for the ports defined in the Domain and Application layers. It handles all external concerns, including data persistence (databases), external APIs, messaging systems, and framework-specific details.
*   **Key Components:**
    *   **Persistence Adapters:** Implementations for database operations (e.g., `PrismaUserRepository`, `MongoOrderRepository`).
    *   **External Service Adapters:** Implementations for interacting with third-party APIs (e.g., `SendGridNotificationService`, `StripePaymentGateway`).
    *   **Framework-Specific Code:** Contains code related to specific frameworks, libraries, or technologies (e.g., web server setup, ORM configuration, message queue clients).
*   **Requirements:**
    *   **Implementation of Ports:** Must implement the interfaces (ports) defined in the inner Domain and Application layers.
    *   **No Business Logic:** Should contain no business rules. Its sole responsibility is to translate between the application/domain's abstract needs and the concrete details of external technologies.
    *   **Dependency on Inner Layers:** Depends on the Domain and Application layers (specifically their ports/interfaces), but the inner layers remain unaware of the infrastructure's concrete implementations.
    *   **Interchangeability:** Adapters should be easily swappable (e.g., changing from one database to another) without requiring changes to the Domain or Application layers.

#### Test Scenarios & Coverage

Testing for the Infrastructure Layer primarily focuses on verifying the correct implementation of Ports by Adapters and their interchangeability. While the internal logic of adapters (e.g., database queries) would typically be covered by integration tests, unit tests ensure the contractual adherence and flexibility of the DI system.

*   **Adapters - Implementation of Ports & Interchangeability:**
    *   **File:** `lib/di.test.ts`
    *   **Test Cases:**
        *   `should resolve a bound adapter`: Demonstrates that a concrete adapter successfully implements and is correctly bound to a defined Port, fulfilling the primary role of an adapter.
        *   `should allow rebinding an adapter`: Explicitly verifies the interchangeability principle, showing that different adapter implementations can be swapped for the same Port, enabling flexible infrastructure choices.

### 4. Presentation Layer (UI / API)

*   **Purpose:** The outermost layer, responsible for handling user interaction, presenting data, and translating external requests (e.g., HTTP requests) into calls to application use cases. It is the entry point for external actors.
*   **Key Components:**
    *   **Controllers (for APIs):** Receive HTTP requests, parse input, call the appropriate use cases in the Application Layer, and format responses (e.g., JSON, XML).
    *   **Views/Components (for UIs):** Render data received from the Application Layer and handle user input events, translating them into use case calls.
*   **Requirements:**
    *   **User Interaction:** Manages all input and output for users or other external systems.
    *   **Translation:** Translates external data formats (e.g., HTTP request bodies, query parameters) into DTOs expected by the Application Layer, and translates use case outputs back into external formats.
    *   **Dependency on Application:** Depends only on the Application Layer. It should not directly interact with the Domain or Infrastructure layers.
    *   **Minimal Logic:** Contains minimal business logic, primarily focusing on presentation, request handling, and data serialization/deserialization.

#### Test Scenarios & Coverage

While the provided `lib/` directory does not contain specific test files for a Presentation Layer (as it focuses on core framework components), testing in a Sota-based application would typically involve:

*   **Controllers/UI Components - Translation & Dependency on Application:**
    *   **Conceptual Test Cases:**
        *   `should translate incoming request to application DTO and call use case`: Tests that the Presentation Layer correctly parses external input (e.g., HTTP request body, form data) and invokes the appropriate Use Case with the correctly structured DTO. This would involve mocking the Use Case.
        *   `should format use case output for external response`: Verifies that the Presentation Layer correctly transforms the Use Case's output into the expected external format (e.g., JSON response, rendered HTML, UI state update).
        *   `should handle application layer errors gracefully`: Ensures that errors propagated from the Application Layer are caught and presented to the user in an appropriate and user-friendly manner (e.g., HTTP error codes, error messages in the UI).

## Composition Root

The **Composition Root** is the specific location in the application where all dependencies are wired together. This is where concrete implementations (Adapters) are bound to their respective interfaces (Ports), typically at application startup. In Sota, this is achieved through mechanisms like `setPortAdapter` calls, ensuring that the inner layers remain decoupled from concrete implementations.

#### Test Scenarios & Coverage

Testing of the Composition Root's underlying mechanism is demonstrated in:

*   **File:** `lib/di.test.ts`
*   **Test Cases:**
    *   `should resolve a bound adapter`: Verifies that the DI container correctly resolves and provides the bound adapter when requested.
    *   `should allow rebinding an adapter`: Confirms the flexibility of the Composition Root to reconfigure dependencies dynamically.
    *   `should throw if an adapter is not bound`: Ensures that the system correctly identifies and reports attempts to resolve unbound dependencies, highlighting the explicit nature of dependency management.

This architectural model provides a robust foundation for building complex, maintainable, and scalable applications by enforcing strict separation of concerns and clear dependency rules.

## Framework Extensions for Comprehensive Development (Nest.js Parity)

To achieve parity with a comprehensive framework like Nest.js while maintaining SotaJS's core architectural principles (DDD, Hexagonal, Clean Architecture), the framework would extend its offerings by providing opinionated, yet pluggable, implementations for common application concerns. These extensions would primarily reside in the **Infrastructure** and **Presentation** layers, acting as specialized adapters or components that integrate seamlessly with the core Domain and Application logic.

### 1. Web/API Layer Extensions (Presentation Layer)

This extension would provide tools for building robust HTTP APIs, integrating with the Application Layer's Use Cases.

*   **Controllers & Routing:**
    *   **Concept:** Components responsible for handling incoming HTTP requests, translating them into Use Case inputs (DTOs), invoking the Use Case, and formatting the Use Case's output into HTTP responses.
    *   **SotaJS Approach:** Provide decorators or conventions for defining API endpoints and mapping them to Use Cases. Controllers would be thin wrappers around Use Case calls.
    *   **Example:** A `@Controller()` decorator for classes and `@Get()`, `@Post()` etc., for methods, automatically handling request parsing and response serialization.
*   **Middleware, Guards, Interceptors, Pipes, Exception Filters:**
    *   **Concept:** Cross-cutting concerns for request processing (e.g., authentication, authorization, validation, logging, error handling).
    *   **SotaJS Approach:** Implement these as specialized adapters or components within the Presentation Layer, or as Application Layer concerns for Guards/Interceptors that operate on Use Case execution. They would interact with Application Ports for external services (e.g., an AuthGuard using an `AuthServicePort`).
    *   **Example:** A `@UseGuard(AuthGuard)` decorator on a controller method, where `AuthGuard` uses `usePort(AuthServicePort)` internally.

### 2. Persistence Layer Extensions (Infrastructure Layer)

This extension would offer ready-to-use integrations with popular data storage solutions.

*   **Database Adapters (ORM/ODM Integration):**
    *   **Concept:** Concrete implementations of Domain Ports for data storage and retrieval (e.g., `UserRepositoryPort` implemented by `PrismaUserRepositoryAdapter`).
    *   **SotaJS Approach:** Provide modules or packages that offer pre-built adapters for popular ORMs/ODMs (e.g., Prisma, TypeORM, Mongoose). These adapters would handle the mapping between domain models and database schemas.
    *   **Example:** A `@DatabaseModule()` that configures a Prisma client and automatically binds `PrismaUserRepositoryAdapter` to `UserRepositoryPort`.
*   **Custom Repositories:**
    *   **Concept:** Specialized data access objects that encapsulate complex query logic.
    *   **SotaJS Approach:** Provide patterns or base classes for creating custom repositories that implement Domain Ports, leveraging the chosen ORM/ODM.

### 3. Messaging & Microservices Extensions (Infrastructure Layer)

This extension would facilitate inter-service communication and event-driven architectures.

*   **Microservices & Event Bus Integrations:**
    *   **Concept:** Adapters for message brokers (e.g., Kafka, RabbitMQ, Redis Pub/Sub) to enable asynchronous communication and domain event dispatching/consumption.
    *   **SotaJS Approach:** Offer modules that provide adapters for common messaging technologies, allowing Use Cases to dispatch Domain Events and other services to consume them via Application Ports.
    *   **Example:** A `@MessageQueueModule()` that binds `KafkaEventBusAdapter` to `EventBusPort`.

### 4. Authentication & Authorization Extensions (Application/Infrastructure Layer)

This extension would provide robust security features.

*   **Authentication Strategies & Guards:**
    *   **Concept:** Mechanisms to verify user identity and control access to resources.
    *   **SotaJS Approach:** Provide a modular system for defining authentication strategies (e.g., JWT, OAuth) as Infrastructure Adapters, and integrate them with Guards (in the Presentation or Application Layer) that protect Use Cases or API endpoints.
    *   **Example:** A `JwtAuthStrategyAdapter` implementing `AuthServicePort`, used by an `AuthGuard`.

### 5. Configuration Management (Infrastructure Layer)

*   **Concept:** A centralized and type-safe way to manage application settings.
*   **SotaJS Approach:** Provide a dedicated configuration module that loads settings from various sources (e.g., environment variables, `.env` files) and makes them available through the DI system.
*   **Example:** A `ConfigService` that can be injected via `usePort(ConfigServicePort)`.

### 6. Enhanced Validation (Presentation/Application Layer)

*   **Concept:** Beyond domain-level `zod` schemas, provide robust validation for incoming request payloads.
*   **SotaJS Approach:** Integrate with libraries like `class-validator` or extend `zod` capabilities for request-specific validation, often used in conjunction with Pipes in the Web/API layer.

### 7. CLI & Scaffolding

*   **Concept:** Command-line tools to streamline development, generate boilerplate, and manage projects.
*   **SotaJS Approach:** Develop a CLI that understands SotaJS conventions, allowing developers to quickly generate Use Cases, Aggregates, Ports, and Adapters, ensuring consistency and accelerating development.

By implementing these extensions, SotaJS would evolve into a comprehensive framework akin to Nest.js, providing a rich set of "batteries included" while strictly adhering to its foundational principles of DDD, Hexagonal, and Clean Architecture.