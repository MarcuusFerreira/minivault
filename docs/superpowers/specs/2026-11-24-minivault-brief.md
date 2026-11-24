# ROLE

Act as a Staff Software Engineer, Software Architect, Domain-Driven Design specialist, and Security Engineer.

Your mission is to design and implement MiniVault, a lightweight secrets management platform inspired by the engineering challenges behind Infisical.

This is a portfolio project intended to demonstrate strong backend engineering, full-stack development, security fundamentals, distributed systems knowledge, Domain-Driven Design, Hexagonal Architecture, and proficiency in TypeScript and Go.

The result must be functional, documented, tested, and reproducible.

Do not build a superficial CRUD application. Prioritize security, maintainability, architectural clarity, and developer experience.

# 1. PRODUCT VISION

MiniVault is a lightweight platform that allows development teams to securely store, organize, retrieve, and audit application secrets.

Users should be able to:

- Create projects.
- Organize projects into environments.
- Store encrypted secrets.
- Retrieve secrets through a REST API.
- Authenticate applications using API keys.
- Control access to secrets.
- Track sensitive operations through audit logs.

The platform should provide a simple developer experience similar to modern secrets management tools.

Important: MiniVault is an experimental educational and portfolio project. Do not claim production-grade security or enterprise readiness.

# 2. TECHNOLOGY STACK

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod
- Lucide Icons

## Backend API

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma ORM
- Redis (optional, only when justified)
- JWT authentication
- API Key authentication
- Swagger / OpenAPI
- Jest
- Supertest

## Secrets Engine

- Go (latest stable version compatible with the environment)
- Gin HTTP framework
- AES-256-GCM
- Go testing package
- Structured logging

## Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- Redis (optional)
- Multi-stage Dockerfiles
- Environment-based configuration

# 3. ARCHITECTURAL PRINCIPLES

This project MUST use Domain-Driven Design (DDD) and Hexagonal Architecture (Ports and Adapters) in BOTH backend services.

This is a mandatory architectural requirement, not an optional recommendation.

Both NestJS and Go must follow the same fundamental architectural principles.

## 3.1. Mandatory layer structure

Every business domain or bounded context must have the following structure:

```text
my-domain/
├── domain/
├── application/
└── infrastructure/
```

Use the actual domain names in the implementation.

### Domain Layer

Contains:

- Entities.
- Aggregates.
- Value Objects.
- Domain Services.
- Domain Events.
- Repository interfaces when they represent domain persistence contracts.
- Domain exceptions.
- Business invariants and rules.

Rules:

- Must not depend on application frameworks.
- Must not depend on infrastructure.
- Must not depend on databases.
- Must not depend on HTTP frameworks.
- Must not contain ORM-specific annotations or models.
- Must not know about NestJS, Gin, Prisma, PostgreSQL, or HTTP.

The domain layer must remain independent and framework-agnostic.

### Application Layer

Contains:

- Use Cases / Application Services.
- Input Ports.
- Output Ports.
- Application DTOs.
- Command and Query objects.
- Application-level orchestration.
- Transaction boundaries.
- Application exceptions.

Rules:

- Application orchestrates domain behavior.
- Application defines the interfaces it needs from external systems.
- Application must not depend on concrete infrastructure implementations.
- Use Cases must be independently testable.
- Dependencies must be injected through ports.

Organize use cases around business operations, not generic CRUD abstractions.

Examples:

- CreateProjectUseCase.
- CreateEnvironmentUseCase.
- StoreSecretUseCase.
- RetrieveSecretUseCase.
- RotateApiKeyUseCase.
- RecordAuditEventUseCase.

### Infrastructure Layer

Contains:

- HTTP controllers and handlers.
- Database repositories.
- ORM models and mappings.
- External API clients.
- Cryptographic service adapters.
- Framework configuration.
- Dependency injection configuration.
- Logging implementations.
- Infrastructure-specific exception handling.

Rules:

- Infrastructure implements the output ports defined by the application layer.
- Infrastructure translates external requests into application input.
- Infrastructure must not contain business rules.
- Infrastructure must not be imported by domain entities or application use cases.

## 3.2. Dependency Rule

Enforce the following dependency direction:

```text
Infrastructure ---> Application ---> Domain
                         |
                         v
                       Domain
```

The domain must never depend on application or infrastructure.

Application must depend only on domain and abstractions.

Infrastructure implements application ports and adapts external technologies to the application.

Use Dependency Injection to connect the components.

## 3.3. Hexagonal Architecture

Implement:

- Input Ports: interfaces defining what the application can do.
- Input Adapters: REST controllers, HTTP handlers, and other external entry points.
- Output Ports: interfaces defining what the application needs.
- Output Adapters: PostgreSQL repositories, cryptographic clients, external service clients, and other integrations.

Do not allow controllers to call repositories directly.

Do not allow domain entities to perform database operations.

Do not allow application use cases to instantiate infrastructure implementations.

## 3.4. Domain-Driven Design

Identify meaningful bounded contexts.

Suggested bounded contexts:

NestJS:
- Identity & Access.
- Project Management.
- Environment Management.
- Secrets Management.
- API Key Management.
- Audit Management.

Go:
- Cryptographic Operations.
- Encryption Key Management.

Avoid creating artificial domains solely to satisfy the folder structure.

Keep aggregates consistent and business invariants inside the domain layer.

Use domain events when they provide meaningful decoupling between business operations.

Do not introduce event-driven infrastructure or message brokers without a concrete requirement.

# 4. MONOREPO STRUCTURE

Create a monorepo with the following structure:

```text
minivault/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       ├── features/
│   │       ├── hooks/
│   │       ├── services/
│   │       └── routes/
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── identity-access/
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── project-management/
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── environment-management/
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── secrets-management/
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── api-key-management/
│       │   │   │   ├── domain/
│       │   │   │   ├── application/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   └── audit-management/
│       │   │       ├── domain/
│       │   │       ├── application/
│       │   │       └── infrastructure/
│       │   │
│       │   ├── shared/
│       │   ├── config/
│       │   └── main.ts
│       └── test/
│
├── services/
│   └── secrets-engine/
│       ├── cmd/
│       │   └── server/
│       │       └── main.go
│       │
│       ├── internal/
│       │   └── cryptographic-operations/
│       │       ├── domain/
│       │       ├── application/
│       │       └── infrastructure/
│       │
│       ├── go.mod
│       └── Dockerfile
│
├── packages/
│   └── contracts/
│
├── infrastructure/
│   ├── docker/
│   └── database/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── API.md
│   └── DEVELOPMENT.md
│
├── docker-compose.yml
├── .env.example
├── README.md
└── package.json
```

You may introduce additional bounded contexts when justified by actual business requirements.

Keep the architecture consistent across both backend services.

# 5. NESTJS ARCHITECTURE REQUIREMENTS

Implement the NestJS backend using modular DDD and Hexagonal Architecture.

Each bounded context must have its own domain, application, and infrastructure layers.

Example:

```text
secrets-management/
├── domain/
│   ├── entities/
│   │   └── secret.entity.ts
│   ├── value-objects/
│   │   ├── secret-key.vo.ts
│   │   └── encrypted-value.vo.ts
│   ├── repositories/
│   │   └── secret.repository.ts
│   ├── services/
│   ├── events/
│   └── exceptions/
│
├── application/
│   ├── ports/
│   │   ├── input/
│   │   │   └── store-secret.port.ts
│   │   └── output/
│   │       ├── secret-persistence.port.ts
│   │       └── encryption.port.ts
│   ├── use-cases/
│   │   ├── store-secret/
│   │   ├── retrieve-secret/
│   │   ├── update-secret/
│   │   └── delete-secret/
│   └── dto/
│
└── infrastructure/
    ├── adapters/
    │   ├── input/
    │   │   └── http/
    │   │       ├── secrets.controller.ts
    │   │       └── dto/
    │   │
    │   └── output/
    │       ├── persistence/
    │       │   ├── prisma-secret.repository.ts
    │       │   └── mappers/
    │       │
    │       └── cryptography/
    │           └── go-crypto.adapter.ts
    │
    └── config/
```

Apply the same organizational principle to all other bounded contexts.

## NestJS-specific rules

- NestJS controllers are input adapters.
- Use Cases implement input ports.
- Repository interfaces are output ports.
- Prisma repositories are output adapters.
- The Go HTTP client is an output adapter.
- NestJS dependency injection wires implementations to their abstractions.
- Prisma models must never be used directly as domain entities.
- Use explicit mappers between persistence models and domain entities.
- Keep DTOs separate from domain objects.
- Do not use NestJS decorators inside the domain layer.
- Avoid generic base repositories that hide domain behavior.

The NestJS application must orchestrate business operations. The Go service must perform cryptographic operations.

# 6. GO SECRETS ENGINE ARCHITECTURE REQUIREMENTS

The Go service MUST also follow DDD and Hexagonal Architecture.

Do not implement a traditional Go HTTP application where handlers directly execute business logic or perform cryptographic operations.

Use the following structure:

```text
secrets-engine/
├── cmd/
│   └── server/
│       └── main.go
│
├── internal/
│   └── cryptographic-operations/
│       ├── domain/
│       │   ├── entities/
│       │   ├── valueobjects/
│       │   ├── services/
│       │   └── exceptions/
│       │
│       ├── application/
│       │   ├── ports/
│       │   │   ├── input/
│       │   │   └── output/
│       │   ├── usecases/
│       │   │   ├── encrypt-secret/
│       │   │   └── decrypt-secret/
│       │   └── dto/
│       │
│       └── infrastructure/
│           ├── adapters/
│           │   ├── input/
│           │   │   └── http/
│           │   │       ├── handlers/
│           │   │       ├── middleware/
│           │   │       └── routes/
│           │   │
│           │   └── output/
│           │       └── key-management/
│           │
│           ├── config/
│           └── server/
│
├── go.mod
└── Dockerfile
```

## Go Domain Layer

Contains:

- Encryption context.
- Ciphertext Value Object.
- Nonce Value Object.
- Encryption Key Version Value Object.
- Domain validation rules.
- Cryptographic domain errors.
- Domain services when necessary.

The domain must not depend on Gin or HTTP.

## Go Application Layer

Contains:

- EncryptSecretUseCase.
- DecryptSecretUseCase.
- Input ports.
- Output ports.
- Application DTOs.

Define an output port for cryptographic operations and an abstraction for retrieving encryption keys.

The application layer orchestrates cryptographic operations without depending on concrete implementations.

## Go Infrastructure Layer

Contains:

- Gin HTTP handlers.
- Gin routes.
- HTTP middleware.
- AES-256-GCM implementation.
- Encryption key provider implementation.
- Configuration loading.
- Logging.
- HTTP server setup.

Gin handlers must only:

1. Receive HTTP requests.
2. Validate transport-level input.
3. Map requests to application commands.
4. Invoke application input ports.
5. Map application results to HTTP responses.

Handlers must never implement cryptographic business logic.

## Go-specific dependency rules

- Domain must not import Gin.
- Application must not import Gin.
- Application must not instantiate infrastructure implementations.
- Infrastructure adapters implement application output ports.
- Dependency injection must be explicit through constructors.
- Prefer interfaces at actual architectural boundaries.
- Avoid unnecessary interfaces for simple internal functions.
- Keep packages small and cohesive.

Use constructor injection and explicit composition in main.go.

# 7. DOMAIN MODEL

Implement the following business concepts.

## User

- id
- name
- email
- passwordHash
- createdAt
- updatedAt

## Project

- id
- name
- description
- ownerId
- createdAt
- updatedAt

## Environment

- id
- projectId
- name (DEVELOPMENT, STAGING, PRODUCTION)
- createdAt

## Secret

- id
- environmentId
- key
- encryptedValue
- nonce
- encryptionKeyVersion
- createdAt
- updatedAt

## ApiKey

- id
- projectId
- name
- keyHash
- permissions
- expiresAt
- lastUsedAt
- createdAt

## AuditLog

- id
- userId (nullable for machine operations)
- projectId
- environmentId (nullable)
- action
- resourceType
- resourceId
- ipAddress
- metadata
- createdAt

Use UUID identifiers.

Define appropriate aggregates, value objects, invariants, database constraints, indexes, and relationships.

Never store raw API keys or plaintext secrets in the database.

Do not make every database table an aggregate root. Define aggregate boundaries based on consistency requirements.

# 8. BACKEND BUSINESS FUNCTIONALITIES

Implement the following bounded contexts.

## Identity & Access

- User registration.
- User login.
- JWT access tokens.
- Password hashing using Argon2id.
- Authentication guards.
- Authorization policies.

## Project Management

- Create project.
- List projects belonging to authenticated user.
- Retrieve project details.
- Update project.
- Delete project.

Users must never access projects belonging to other users.

## Environment Management

- Create environments.
- List environments.
- Retrieve environment details.
- Delete environments.

Create DEVELOPMENT, STAGING, and PRODUCTION environments when a project is created.

## Secrets Management

- Create a secret.
- Update a secret.
- Retrieve a secret.
- List secret metadata without exposing values.
- Delete a secret.
- Retrieve multiple secrets through an authorized API endpoint.

Secret values must never appear in application logs, audit metadata, error messages, or metadata-only API responses.

## API Key Management

- Generate API keys.
- Revoke API keys.
- List API key metadata.
- Support expiration.
- Support environment-level permissions.

Generate cryptographically secure random API keys.

Store only secure hashes of API keys. Show plaintext only once after creation.

## Audit Management

Record operations such as:

- SECRET_CREATED
- SECRET_UPDATED
- SECRET_ACCESSED
- SECRET_DELETED
- API_KEY_CREATED
- API_KEY_REVOKED
- PROJECT_CREATED

Never record secret values or API key plaintext.

Audit events should be persisted reliably. Prefer writing business changes and corresponding audit events within the same database transaction when applicable.

# 9. GO CRYPTOGRAPHIC OPERATIONS

Implement the following application use cases:

- EncryptSecretUseCase.
- DecryptSecretUseCase.

Use AES-256-GCM.

Encryption requirements:

- Generate a unique cryptographically secure nonce for every encryption operation.
- Never reuse a nonce with the same encryption key.
- Authenticate encrypted data using GCM.
- Support key version identification.
- Validate key lengths.
- Use authenticated additional data (AAD) to bind encrypted values to their project and environment context.
- Return ciphertext, nonce, and key version.
- Never log plaintext secrets.

The encryption master key must be injected through secure configuration and must not be committed to source control.

Do not persist encryption master keys in PostgreSQL.

Document the limitations of the development key-management strategy and explain how a real KMS or HSM integration could replace it.

The Go service must not be publicly exposed.

Only the NestJS backend should communicate with it through an internal Docker network.

Authenticate service-to-service communication.

Do not expose encryption endpoints directly to frontend clients.

# 10. FRONTEND — REACT

Build a polished, modern developer-oriented dashboard.

Visual direction:

- Minimalist.
- Professional.
- Dark-first interface.
- Inspired by modern developer infrastructure tools.
- Excellent spacing and typography.
- Responsive layout.
- Clear loading, error, and empty states.

Use shadcn/ui and Tailwind CSS.

## Pages

### Authentication

- Login.
- Registration.

### Dashboard

- Project overview.
- Number of projects.
- Number of environments.
- Number of secrets.
- Recent activity.

### Projects

- Project listing.
- Create project modal.
- Project details.

### Environments

- Environment selector.
- DEVELOPMENT, STAGING, PRODUCTION tabs.

### Secrets

- Secret listing.
- Create secret.
- Edit secret.
- Delete secret.
- Reveal secret value through an explicit user action.
- Copy secret value.
- Search and filter.
- Mask sensitive values by default.

### API Keys

- Generate API key.
- Display key once after creation.
- Revoke key.
- Show expiration and permissions.

### Audit Logs

- Timeline of sensitive operations.
- Filter by action.
- Filter by project.
- Display timestamps and actors.

Never store secret values in localStorage, sessionStorage, analytics, or frontend logs.

Avoid caching sensitive responses in TanStack Query. Use appropriate cache policies and clear sensitive in-memory state when the user logs out or changes projects.

# 11. SECURITY REQUIREMENTS

Implement:

- Argon2id password hashing.
- AES-256-GCM encryption.
- Secure random API key generation.
- API key hashing.
- JWT validation.
- Project-level authorization.
- Environment-level permissions.
- Input validation.
- Rate limiting.
- CORS configuration.
- Security headers.
- SQL injection prevention.
- Safe error handling.
- Secret redaction in logs.
- Request size limits.
- Internal-only communication with the Go service.

Do not invent cryptographic algorithms.

Do not implement custom cryptographic primitives.

Document the threat model and security assumptions.

# 12. TESTING

## NestJS tests

- Domain unit tests.
- Application use case tests.
- Infrastructure adapter tests.
- Integration tests.
- Authentication tests.
- Authorization tests.
- Project isolation tests.
- API key validation tests.
- Secret encryption/decryption tests.
- Audit logging tests.

## Go tests

- Domain tests.
- Application use case tests.
- Infrastructure adapter tests.
- Encryption/decryption round trips.
- Invalid key handling.
- Invalid nonce handling.
- Tampered ciphertext rejection.
- AAD validation.
- Unique nonce generation.
- HTTP handler tests.

## Frontend tests

- Authentication flows.
- Project creation.
- Secret creation.
- Secret reveal behavior.
- API key creation.
- Error states.

Include tests proving that one user cannot access another user's projects or secrets.

Use mocks and fakes at architectural boundaries.

Test business rules independently of infrastructure.

# 13. DEVELOPER EXPERIENCE

Provide:

- Docker Compose for local development.
- Database migrations.
- Seed data for demonstration.
- .env.example.
- Swagger documentation.
- Health endpoints.
- Consistent error response format.
- Structured JSON logs.
- Request correlation IDs.
- Clear setup instructions.

The entire application must start with a simple documented command.

Example:

docker compose up --build

Never include real secrets, credentials, or encryption keys in the repository.

# 14. DOCUMENTATION

Write all documentation in English.

README.md must include:

- Product overview.
- Features.
- Architecture diagram.
- Technology stack.
- Screenshots section.
- Prerequisites.
- Installation instructions.
- Environment variables.
- Running locally.
- Running tests.
- API documentation.
- Security considerations.
- Known limitations.

ARCHITECTURE.md must explain:

- Bounded contexts.
- Domain models.
- Aggregate boundaries.
- Responsibilities of each layer.
- Input and output ports.
- Input and output adapters.
- Dependency direction.
- Responsibilities of each service.
- Communication between NestJS and Go.
- Database design.
- Authentication and authorization flows.
- Encryption and decryption flows.
- Important architectural decisions.

SECURITY.md must explain:

- Threat model.
- Key management.
- Encryption strategy.
- API key storage.
- Access control.
- Audit logging.
- Security limitations.

# 15. DEVELOPMENT WORKFLOW

Do not generate the entire application in one uncontrolled step.

Work incrementally.

Before implementation:

1. Inspect the existing repository.
2. Identify the current development environment.
3. Identify bounded contexts.
4. Define domain models and aggregate boundaries.
5. Define input and output ports.
6. Propose the architecture for BOTH backend services.
7. Explain important technical decisions.
8. Create a phased implementation plan.
9. Identify security risks.

Then implement in phases:

PHASE 1 — Architecture and Foundation

- Monorepo.
- Domain boundaries.
- DDD and Hexagonal Architecture folder structures.
- Docker Compose.
- PostgreSQL.
- NestJS application.
- Go service.
- React application.
- Health checks.

PHASE 2 — Identity and Core Domains

- Authentication.
- Users.
- Projects.
- Environments.
- Database migrations.
- Domain unit tests.
- Application use case tests.

PHASE 3 — Secrets Engine

- Go domain model.
- Go application ports and use cases.
- AES-256-GCM infrastructure adapter.
- Encryption and decryption.
- Secure service communication.
- NestJS cryptography output adapter.
- Secret CRUD.

PHASE 4 — API Keys and Audit

- API key lifecycle.
- Permissions.
- Audit events.
- Authorization tests.

PHASE 5 — Frontend

- Dashboard.
- Projects.
- Environments.
- Secrets.
- API Keys.
- Audit logs.

PHASE 6 — Quality

- Integration tests.
- Security tests.
- Architecture validation.
- Documentation.
- Docker optimization.
- Demo data.

After every phase:

- Run relevant tests.
- Fix compilation errors.
- Review architectural boundaries.
- Review security implications.
- Update documentation.
- Report completed work and remaining tasks.

Never claim a feature is complete unless it is implemented and tested.

Do not leave critical functionality as TODOs or placeholders.

Do not introduce unnecessary microservices or abstractions.

Prefer simple, explicit, maintainable solutions.

# 16. ARCHITECTURAL VALIDATION

This is a mandatory acceptance criterion.

Verify that:

- Domain layers have no framework dependencies.
- Domain layers have no database dependencies.
- Application layers depend only on domain and abstractions.
- Infrastructure implements output ports.
- HTTP controllers and handlers act only as input adapters.
- No controller accesses repositories directly.
- No use case instantiates infrastructure implementations.
- Prisma models never leak into domain or application layers.
- Gin handlers never contain cryptographic business logic.
- Go application use cases do not depend on Gin.
- NestJS and Go maintain consistent dependency direction.

Use automated dependency validation where practical.

When a dependency violates the architectural rules, refactor it before considering the phase complete.

# 17. SUCCESS CRITERIA

The project is considered complete when:

- A user can register and log in.
- A user can create and manage projects.
- Projects have isolated environments.
- Secrets can be securely encrypted and stored.
- Secrets can be retrieved through authenticated API requests.
- API keys can be created, validated, and revoked.
- Sensitive operations generate audit logs.
- The React dashboard supports the core workflows.
- The Go service handles cryptographic operations.
- Both backend services follow DDD and Hexagonal Architecture.
- Automated tests validate critical security boundaries.
- Docker Compose starts the complete application.
- Documentation is written in English.

# FINAL INSTRUCTION

Think like an engineer building a developer infrastructure product.

The objective is not to clone Infisical.

The objective is to demonstrate that the developer understands the engineering problems behind secrets management and can build a thoughtful, secure, maintainable solution using TypeScript and Go.

Architecture is a first-class requirement.

Do not sacrifice DDD or Hexagonal Architecture for implementation speed.

Start by inspecting the repository and proposing the bounded contexts, domain models, aggregate boundaries, ports, adapters, and implementation plan.

Do not begin generating all files before presenting the architecture and plan.
