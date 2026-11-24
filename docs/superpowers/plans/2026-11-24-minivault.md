# MiniVault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tested, documented secrets management platform that starts with `docker compose up --build`.

**Architecture:** NestJS orchestrates identity, authorization, persistence and audit; an isolated Go service holds master keys and performs AES-256-GCM; a React SPA uses the REST API. Both backends are DDD + hexagonal with machine-checked dependency rules. Contexts talk through ports and an in-process event bus dispatched inside the business transaction.

**Tech Stack:** Node 24, TypeScript 5.9.3, NestJS 12, Prisma 7.10.1, PostgreSQL 18, Jest 30, Go 1.27, Gin 1.12, React 19, Vite 8, Tailwind 4, shadcn/ui, TanStack Query 5, Vitest (web only), Docker Compose.

**Spec:** [brief](../specs/2026-11-24-minivault-brief.md) and [architecture design](../specs/2026-11-24-minivault-design.md). Read both. Section numbers below (D§n) refer to the design.

## Global Constraints

- Skills, load before writing the code: NestJS tasks use `nestjs`, plus `nestjs-feature`, `nestjs-data`, `nestjs-testing`, `nestjs-production` where relevant. Web tasks use `frontend-design` **and** `vercel-react-best-practices`. When a skill conflicts with D§10 or the brief (Vitest for the API, Drizzle, `@nestjs/authentication`, `@nestjs/observe`), the brief wins.
- Exact pins: `prisma`, `@prisma/client`, `@prisma/adapter-pg` at `7.10.1` (never `latest`: it is an 8.0 RC); `typescript` at `5.9.3`. Commit the lockfile; images pinned to `node:24-alpine`, `postgres:18-alpine`, `golang:1.27`.
- ESM everywhere: relative imports end in `.js`. API tests use Jest with `NODE_OPTIONS=--experimental-vm-modules`.
- Layers: `domain/` imports only itself and `shared/domain`. `application/` imports only its own domain, itself, `shared/domain`, `shared/application`; no `@nestjs/*`, `@prisma/*`, `zod`, `express`, `node:http`. Use cases have no decorators and receive ports by constructor. Cross-module imports only `infrastructure/` -> other module's `application/ports/input/`.
- Go: `domain` imports only the standard library, never `net/http`; `application` never imports Gin, `net/http` or `infrastructure`. No Go on the host: always `scripts/go.sh`.
- File names follow the brief's examples: `secret.entity.ts`, `secret-key.vo.ts`, `store-secret.port.ts`, `use-cases/store-secret/store-secret.use-case.ts`, `prisma-secret.repository.ts`, `go-crypto.adapter.ts`. Tests sit beside code as `*.spec.ts`; integration tests in `apps/api/test/*.e2e-spec.ts`.
- All text in English. Never claim production-grade security. No real secret, key or credential committed; test keys are generated at run time or obviously fake.
- Secret values and API key plaintext never reach logs, audit metadata, error messages, metadata responses, localStorage, sessionStorage or the TanStack cache.
- Secret value: 0 to 32768 UTF-8 bytes, well-formed Unicode. API body limit 256 KB; engine body limit 64 KB.
- Error body: `{"error":{"code","message","correlationId","details?"}}`. Other users' resources: 404.
- Every phase ends with its gate. A failing architecture check blocks the phase.

## Review Focus

Not exercised by the obvious tests for each feature; each is pinned in the named task.

1. Two simultaneous creates of the same secret key, project name or email: exactly one 201, others 409, never 500 (Task 12, pattern set in Task 5).
2. Unusual secret values (empty string, trailing newline, emoji, 32768 bytes exactly): returned byte-identical; unpaired surrogates rejected with 400, not silently replaced (Task 11).
3. Engine down, slow, or returning garbage: 503 `ENCRYPTION_UNAVAILABLE` within 3 s, nothing written, list of secrets still works (Task 12).
4. Session expiring while a user is mid-edit: redirected to login with a message and all revealed values cleared; no blank screen (Task 18).
5. Deleting a project or environment while an API key granted to it is in use: the next machine call gets 401 (project gone) or 403/404 (environment gone), and the audit history stays readable (Task 15).

---

# PHASE 1: Architecture and Foundation

### Task 1: Monorepo, API skeleton and architecture enforcement

**Files:**
- Create: `package.json` (workspaces `apps/*`, `packages/*`), `.gitignore` (incl. `.env`, `.claude/`, `**/generated/`), `.editorconfig`, `tsconfig.base.json`, `eslint.config.js`
- Create: `apps/api/{package.json,nest-cli.json,tsconfig.json,jest.config.js,.dependency-cruiser.cjs}`, `apps/api/src/{main.ts,app.module.ts,configure-app.ts}`, `apps/api/src/config/env.ts`, `apps/api/src/shared/infrastructure/health/health.controller.ts`
- Create: `packages/contracts/{package.json,tsconfig.json,src/index.ts}`
- Test: `apps/api/test/health.e2e-spec.ts`, `apps/api/test/architecture/architecture.spec.ts` and `fixtures/`

**Interfaces:**
- Produces: `configureApp(app: NestExpressApplication): void` (prefix `api/v1` excluding `health`, `ready`; used by `main.ts` and every e2e test); `envSchema` (zod) and `type Env`.
- Root scripts: `build`, `lint`, `test` (unit), `test:e2e`, `arch`, `engine:test`, `engine:vet`.
- Env: `NODE_ENV, PORT=3000, DATABASE_URL, JWT_SECRET (>=32 chars), JWT_TTL_SECONDS=1800, WEB_ORIGIN, COOKIE_SECURE (boolean from "true"/"false"), ENGINE_URL, ENGINE_AUTH_TOKEN (>=32), ENGINE_TIMEOUT_MS=3000, THROTTLE_LIMIT=100, AUTH_THROTTLE_LIMIT=5`.

- [ ] **Step 1:** `git init -b main`, scaffold with `npx @nestjs/cli new api --skip-git --package-manager npm --no-observe` in `apps/`, then replace Vitest with the verified Jest configuration:

```js
export default {
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['@swc/jest', {
    jsc: { parser: { syntax: 'typescript', decorators: true },
           transform: { legacyDecorator: true, decoratorMetadata: true }, target: 'es2022' },
    module: { type: 'es6' } }] },
};
```

- [ ] **Step 2: Failing tests.** `GET /health` -> 200 `{"status":"ok"}`. `envSchema` rejects a 31-character `JWT_SECRET`, and parses `COOKIE_SECURE="false"` as `false`. Architecture spec runs dependency-cruiser's API on `src` expecting 0 errors, and on each fixture expecting exactly the named rule: `domain-no-framework`, `domain-no-outer-layer`, `application-no-framework`, `application-no-infrastructure`, `no-cross-context-except-input-ports`, `controllers-no-persistence`, `no-circular`.
- [ ] **Step 3:** Run `npm test -w apps/api`. Expected: FAIL (missing modules).
- [ ] **Step 4:** Implement. The rules apply by path regex `modules/[^/]+/(domain|application|infrastructure)`; `controllers-no-persistence` forbids `adapters/input/` -> `adapters/output/` and -> `domain/repositories/`. Prisma is importable only from `adapters/output/persistence` and `shared/infrastructure/prisma`.
- [ ] **Step 5:** Run `npm run build && npm run lint && npm test && npm run arch`. Expected: all pass.
- [ ] **Step 6:** Commit `chore: scaffold monorepo with enforced architecture rules`.

### Task 2: Go service skeleton and architecture test

**Files:**
- Create: `scripts/go.sh`, `services/secrets-engine/{go.mod,cmd/server/main.go}`, `internal/cryptographic-operations/infrastructure/{config/config.go,server/server.go,adapters/input/http/handlers/health.go,adapters/input/http/routes/routes.go}`
- Test: `internal/architecture_test.go`, `config/config_test.go`, `handlers/health_test.go`

**Interfaces:**
- Produces: `config.Load(getenv func(string) string) (Config, error)`; `Config{Addr string; AuthToken string; ActiveKeyVersion uint32; MasterKeys map[uint32][]byte}`; `routes.New(deps routes.Dependencies) *gin.Engine`. Module path `github.com/minivault/secrets-engine`.
- `scripts/go.sh <args>`: `docker run --rm -u $(id -u):$(id -g) -v services/secrets-engine:/src -w /src` with module and build caches in `.cache/go`, image `golang:1.27`.

- [ ] **Step 1: Failing tests.** Health: `GET /health` -> 200. Config table: valid `1:<b64 32B>`; errors for 16-byte key, 31-byte key, bad base64, duplicate version, version 0, active version absent, empty keys, token of 31 characters. Every config error string must not contain the key material. Architecture: parse imports with `go/parser`; `domain` and `application` violations reported by file; a table test feeds the checker a bad `(layer, import)` pair and expects a violation.
- [ ] **Step 2:** Run `scripts/go.sh test ./...`. Expected: FAIL.
- [ ] **Step 3:** Implement; `slog` JSON handler; server timeouts: read header 5 s, read 10 s, write 10 s, idle 60 s; graceful shutdown on SIGTERM.
- [ ] **Step 4:** Run `scripts/go.sh vet ./... && scripts/go.sh test -race ./...`. Expected: `ok` for all.
- [ ] **Step 5:** Commit `feat(engine): scaffold secrets engine with validated configuration`.

### Task 3: Web skeleton, Compose and environment bootstrap

**Files:**
- Create: `apps/web/` (Vite React TS, Tailwind 4, Vitest, RTL, MSW; `src/{components,features,hooks,services,routes}`)
- Create: `apps/api/Dockerfile`, `services/secrets-engine/Dockerfile`, `apps/web/Dockerfile`, `infrastructure/docker/nginx.conf`, `.dockerignore`, `docker-compose.yml`, `.env.example`, `scripts/init-env.sh`, `scripts/smoke.sh`

**Interfaces:**
- Produces: Compose services `web, api, secrets-engine, postgres` on the networks in D§2; `scripts/smoke.sh` asserting the running stack.

- [ ] **Step 1: Failing check.** `scripts/smoke.sh` asserts: `GET :8080/` 200; `GET :8080/health` 200; only `web` has published ports (`docker compose ps --format json`); from `web`, `wget secrets-engine:8081/health` fails to resolve; from `api` it succeeds; containers run as non-root. Run it: FAIL.
- [ ] **Step 2:** Implement. Multi-stage, non-root images: api on `node:24-alpine`, engine static on `gcr.io/distroless/static-debian13:nonroot`, web on `nginxinc/nginx-unprivileged:alpine`. Engine healthcheck: `/server -healthcheck`. nginx sets `X-Forwarded-For $remote_addr` (overwrite, not append), `client_max_body_size 256k`, SPA fallback, and CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. Swagger under `/api/docs` gets its own relaxed CSP for inline scripts only there.
- [ ] **Step 3:** `init-env.sh`: exits 0 without changes when `.env` exists; otherwise writes mode 600 with `openssl rand -base64 32` values for `POSTGRES_PASSWORD` (hex), `JWT_SECRET`, `ENGINE_AUTH_TOKEN`, `MASTER_KEYS=1:…`, `DEMO_USER_PASSWORD`. Compose uses `${VAR:?Run scripts/init-env.sh first}`. `.env.example` has empty values with comments.
- [ ] **Step 4:** Run `sh scripts/init-env.sh && docker compose up --build -d --wait && sh scripts/smoke.sh`. Expected: `SMOKE OK`. Running `init-env.sh` again leaves the checksum of `.env` unchanged.
- [ ] **Step 5:** Commit `feat: containerized stack with isolated networks`.

**Phase 1 gate:** `npm run build && npm run lint && npm test && npm run arch`, `npm run engine:test`, smoke script. Start `docs/ARCHITECTURE.md` from the design and `docs/DEVELOPMENT.md`. Report completed and remaining work.

---

# PHASE 2: Identity and Core Domains

### Task 4: Shared kernel, HTTP conventions and database

**Files:**
- Create: `apps/api/src/shared/domain/{aggregate-root.ts,domain-event.ts,domain-error.ts,principal.ts,uuid.ts}`, `shared/application/{unit-of-work.ts,domain-event-publisher.ts,clock.ts,id-generator.ts,application-error.ts,authentication.ts}`
- Create: `shared/infrastructure/{prisma/,events/in-process-event-bus.ts,http/error.filter.ts,http/correlation-id.middleware.ts,http/request-logger.middleware.ts,logging/}`
- Create: `apps/api/prisma/{schema.prisma,migrations/}`, `apps/api/prisma.config.ts`, `apps/api/test/support/{global-setup.ts,app.ts,database.ts}`
- Modify: `docker-compose.yml` (one-shot `migrate` service; api waits on `service_completed_successfully`)

**Interfaces:**
- Produces:

```ts
type Actor = { userId: string | null; apiKeyId: string | null; ipAddress: string | null };
type Principal =
  | { kind: 'user'; userId: string }
  | { kind: 'apiKey'; apiKeyId: string; projectId: string; grants: readonly Grant[] };
type Permission = 'SECRETS_READ' | 'SECRETS_WRITE';
type Grant = { environmentId: string; permissions: readonly Permission[] };
interface RequestContext { principal: Principal; ipAddress: string | null }   // on every command
function actorOf(ctx: RequestContext): Actor;
interface DomainEvent { readonly name: string; readonly occurredAt: Date }
abstract class AggregateRoot { protected record(e: DomainEvent): void; pullEvents(): DomainEvent[] }
abstract class DomainError extends Error { abstract readonly code: string }
class ApplicationError extends Error { code: string; kind: 'not_found'|'conflict'|'forbidden'|'unauthenticated'|'invalid'|'unavailable'|'internal' }
// Event classes crossing contexts live in shared/domain/events/*.event.ts (published language), never in a module's domain
interface UnitOfWork { run<T>(work: () => Promise<T>): Promise<T> }            // nested run joins
interface DomainEventPublisher { publish(events: DomainEvent[], actor: Actor): Promise<void> }
interface DomainEventSubscriber { handles: string[]; handle(e: DomainEvent, actor: Actor): Promise<void> }
interface Clock { now(): Date }   interface IdGenerator { next(): string }
interface UserAuthenticator { authenticate(token: string): Promise<{ userId: string } | null> }
interface ApiKeyAuthenticator { authenticate(key: string): Promise<Extract<Principal,{kind:'apiKey'}> | null> }
// infrastructure
class PrismaContext { get client(): PrismaClient | Prisma.TransactionClient }  // AsyncLocalStorage
function isUniqueViolation(e: unknown): boolean                                // code === 'P2002'
// tests
createTestApp(overrides?): Promise<{ app; http; close() }>;  resetDatabase(): Promise<void>
```

- HTTP mapping: `DomainError` -> 400; kinds -> 404/409/403/401/422/503/500 in the order listed; schema errors -> 400 `VALIDATION_ERROR` with `details: [{path, message}]` (never the received value); unknown -> 500 `INTERNAL_ERROR`, generic message, name and stack logged (not the message).

- [ ] **Step 1: Failing unit tests.** Aggregate: `pullEvents` drains. Bus: awaits subscribers in order; a rejection propagates. Filter: each kind -> status; unknown error text absent from the body. Correlation: accepts inbound `^[A-Za-z0-9-]{8,64}$`, otherwise generates a UUID.
- [ ] **Step 2: Failing integration tests** (Testcontainers `postgres:18-alpine` in Jest global setup, `--runInBand`): a throw inside `run` rolls back; nested `run` joins; `UPDATE` and `DELETE` on `audit_logs` fail; a malformed JSON body -> 400 in the standard shape; a 300 KB body -> 413 in the standard shape; `/ready` -> 503 when the database is stopped.
- [ ] **Step 3:** Implement the full schema of D§7 as the first migration (generate, then append the checks and trigger by hand). Request log fields: `correlationId, method, route (pattern, not URL), status, durationMs, principalKind`; no headers, bodies or query strings.
- [ ] **Step 4:** Run `npm test -w apps/api && npm run test:e2e -w apps/api`. Expected: PASS. `docker compose up --build -d --wait`: `migrate` exits 0.
- [ ] **Step 5:** Commit `feat(api): shared kernel, transactional event bus, schema and error format`.

### Task 5: Identity & Access

**Files:** `apps/api/src/modules/identity-access/**`, `shared/infrastructure/http/auth/{auth.guard.ts,public.decorator.ts,allow-api-key.decorator.ts,request-context.decorator.ts}`, `packages/contracts/src/auth.ts`, `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 4 types.
- Produces: `User.register({id,name,email: Email,passwordHash,now})`, `Email.create(raw)`, `PlainPassword.create(raw)`; `UserRepository { add(u): Promise<void>; findByEmail(e: Email); findById(id) }` (`add` throws `EmailAlreadyRegisteredError`); `PasswordHasher { hash(p): Promise<string>; verify(p, hash: string | null): Promise<boolean> }`; `AccessTokenService { issue(userId): Promise<{token; expiresIn}>; verify(token): Promise<string | null> }`; ports `RegisterUserPort, LoginPort, AuthenticateUserPort, GetCurrentUserPort`; `@Public()`, `@AllowApiKey()`, `@Ctx(): RequestContext`; contracts `registerRequest, loginRequest, UserResponse, LoginResponse`; test helper `signUp(http, email): Promise<{token, userId}>`.

- [ ] **Step 1: Failing unit tests.** Email `"  A@B.Co "` -> `a@b.co`; `"a"` rejected. Password: 11 and 129 rejected, 12 and 128 accepted. `User` JSON serialization contains no hash. Login with unknown email still calls `verify(p, null)` and raises `INVALID_CREDENTIALS`, the same error as a wrong password. Argon2 adapter: hash starts `$argon2id$v=19$m=19456,t=2,p=1`. JWT adapter rejects `alg: none`, wrong secret, wrong issuer, wrong audience, expired.
- [ ] **Step 2: Failing e2e tests.** Register 201; the same email in another case 409; **20 concurrent registrations of one email -> one 201, nineteen 409** (throttle limit raised by env; Review Focus 1). Login 200; wrong password 401; no password hash in any response. `/auth/me` without credentials 401; with token 200; after the user row is deleted 401. `POST /auth/session` sets `HttpOnly; SameSite=Strict; Path=/api` and the body has no token; cookie + missing or foreign `Origin` on POST -> 403 `CSRF_REJECTED`; `DELETE /auth/session` clears it. Sixth login within a minute -> 429 with `Retry-After`.
- [ ] **Step 3:** Run both suites. Expected: FAIL.
- [ ] **Step 4:** Implement. Global guard order: throttler, then auth. Guard precedence: `X-API-Key` > `Bearer` > cookie; a presented invalid credential never falls through to the next. Pin `algorithms: ['HS256']`. `configureApp` also gets helmet, CORS (`WEB_ORIGIN` only, credentials), `trust proxy` 1, `StandardSchemaValidationPipe`.
- [ ] **Step 5:** Run `npm test -w apps/api && npm run test:e2e -w apps/api && npm run arch`. Expected: PASS. Commit `feat(api): identity and access`.

### Task 6: Project Management

**Files:** `apps/api/src/modules/project-management/**`, `packages/contracts/src/projects.ts`, `apps/api/test/projects.e2e-spec.ts`

**Interfaces:**
- Produces: `Project.create({id,name: ProjectName,description,ownerId,now})`, `.update({name?,description?}, now)`, `.markDeleted(now)`, `.isOwnedBy(userId)`; events `ProjectCreated|ProjectUpdated|ProjectDeleted {projectId, ownerId, name}`; `ProjectRepository {add, save, remove, findById, listByOwner}`; `ProjectStatisticsQuery.forOwner(ownerId): Promise<Map<string,{environmentCount; secretCount}>>`; `AuthorizeProjectAccessPort.execute({principal, projectId}): Promise<void>` (throws not_found `PROJECT_NOT_FOUND`; API key passes only for its own project); `ListOwnedProjectIdsPort.execute(userId): Promise<string[]>`; `ProjectResponse {id,name,description,environmentCount,secretCount,createdAt,updatedAt}`.

- [ ] **Step 1: Failing unit tests.** Name trimmed; empty, whitespace-only and 101 characters rejected; description at most 500. `CreateProject` publishes `ProjectCreated` inside `UnitOfWork.run` (fake records ordering). Update, delete and get by a non-owner -> `PROJECT_NOT_FOUND`.
- [ ] **Step 2: Failing e2e tests.** CRUD; duplicate name same owner 409, different owner 201; Bob's GET, PATCH, DELETE on Alice's project all 404 with a body identical (apart from correlationId) to a nonexistent id; Bob's list excludes it; malformed UUID 400.
- [ ] **Step 3:** Run; expected FAIL. Implement. `remove` and `save` filter by id and owner and treat zero affected rows as not found.
- [ ] **Step 4:** Run `npm test -w apps/api && npm run test:e2e -w apps/api && npm run arch`. Expected: PASS. Commit `feat(api): project management`.

### Task 7: Environment Management

**Files:** `apps/api/src/modules/environment-management/**`, `packages/contracts/src/environments.ts`, `apps/api/test/environments.e2e-spec.ts`

**Interfaces:**
- Consumes: `AuthorizeProjectAccessPort`, `ProjectCreated`.
- Produces: `EnvironmentName` VO; `Environment.create`, `.markDeleted`; events `EnvironmentCreated|EnvironmentDeleted {projectId, environmentId, name}`; ports `CreateEnvironment, ListEnvironments, GetEnvironment, DeleteEnvironment, ProvisionDefaultEnvironments`; internal input port `FindEnvironmentPort.execute({projectId, environmentId? , name?}): Promise<{id,name} | null>` for other contexts; `EnvironmentResponse {id,projectId,name,createdAt}`.

- [ ] **Step 1: Failing unit tests.** `EnvironmentName.create('QA')` rejected. Subscriber on `ProjectCreated` provisions exactly three.
- [ ] **Step 2: Failing e2e tests.** Creating a project yields DEVELOPMENT, STAGING, PRODUCTION listed in that order; **a subscriber that throws leaves no project row**; delete then recreate STAGING 201; duplicate 409; an environment id from another project in the URL -> 404 even for the owner of both; cross-user 404; `QA` 400.
- [ ] **Step 3:** Run; expected FAIL. Implement; subscriber under `adapters/input/events/`.
- [ ] **Step 4:** Run `npm test -w apps/api && npm run test:e2e -w apps/api && npm run arch`. Expected: PASS. Commit `feat(api): environment management`.

**Phase 2 gate:** all suites + smoke. Review boundaries and security; update ARCHITECTURE.md. Report.

---

# PHASE 3: Secrets Engine

### Task 8: Go domain and application

**Files:** `services/secrets-engine/internal/cryptographic-operations/domain/{entities/encryption_context.go,valueobjects/{ciphertext,nonce,key_version,encryption_key}.go,exceptions/errors.go}`, `application/{ports/input,ports/output,dto,usecases/encrypt-secret,usecases/decrypt-secret}`, tests beside each

**Interfaces:**
- Produces:

```go
func NewEncryptionContext(projectID, environmentID, secretID string) (EncryptionContext, error)
func (EncryptionContext) AAD() []byte // minivault:v1|project=<uuid>|environment=<uuid>|secret=<uuid>
func NewNonce([]byte) (Nonce, error)            // exactly 12
func NewCiphertext([]byte) (Ciphertext, error)  // >= 16
func NewKeyVersion(uint32) (KeyVersion, error)  // >= 1
func NewEncryptionKey(KeyVersion, []byte) (EncryptionKey, error) // 32; String/GoString/LogValue -> "[REDACTED]"
var ErrInvalidContext, ErrInvalidNonce, ErrInvalidCiphertext, ErrInvalidKeyVersion, ErrInvalidKey, ErrUnknownKeyVersion, ErrDecryptionFailed, ErrPlaintextTooLarge error

type Cipher interface {
  Seal(key EncryptionKey, nonce Nonce, plaintext, aad []byte) (Ciphertext, error)
  Open(key EncryptionKey, nonce Nonce, ct Ciphertext, aad []byte) ([]byte, error) }
type KeyProvider interface { Active(context.Context) (EncryptionKey, error); ByVersion(context.Context, KeyVersion) (EncryptionKey, error) }
type NonceGenerator interface { Next() (Nonce, error) }
type EncryptSecret interface { Execute(context.Context, dto.EncryptCommand) (dto.EncryptResult, error) }
type DecryptSecret interface { Execute(context.Context, dto.DecryptCommand) (dto.DecryptResult, error) }
// EncryptCommand{ProjectID,EnvironmentID,SecretID string; Plaintext []byte}; EncryptResult{Ciphertext,Nonce []byte; KeyVersion uint32}
```

- [ ] **Step 1: Failing tests.** AAD exact string; uppercase UUID canonicalized; non-UUID (including one containing `|`) rejected. Nonce 11 and 13 rejected; ciphertext 15 rejected, 16 accepted; key 16/31/33 rejected. `fmt.Sprintf("%v %+v %#v %s", key…)` and a slog JSON line contain no key byte. Encrypt: uses the active key, passes AAD, 32768 bytes accepted and 32769 -> `ErrPlaintextTooLarge`, nonce generator error aborts before `Seal`. Decrypt: unknown version -> `ErrUnknownKeyVersion`; cipher error -> `ErrDecryptionFailed`.
- [ ] **Step 2:** `scripts/go.sh test ./...` FAIL. Implement (UUID check by regexp; no dependency). Run `scripts/go.sh test -race ./...`: `ok`.
- [ ] **Step 3:** Commit `feat(engine): cryptographic domain and use cases`.

### Task 9: Go infrastructure

**Files:** `infrastructure/adapters/output/{aesgcm/cipher.go,key-management/static_key_provider.go,nonce/random.go}`, `infrastructure/adapters/input/http/{handlers,middleware,routes}`, `cmd/server/main.go`, tests beside each

**Interfaces:**
- Produces HTTP: `POST /internal/v1/encrypt {projectId,environmentId,secretId,plaintext:b64}` -> 200 `{ciphertext:b64,nonce:b64,keyVersion}`; `POST /internal/v1/decrypt {…ids,ciphertext,nonce,keyVersion}` -> 200 `{plaintext:b64}`. Errors `{"error":{"code","message","correlationId"}}`: 400 `INVALID_REQUEST`, 401 `UNAUTHORIZED`, 413 `PAYLOAD_TOO_LARGE`, 422 `DECRYPTION_FAILED` or `UNKNOWN_KEY_VERSION`, 500 `INTERNAL_ERROR`.

- [ ] **Step 1: Failing tests.** Round trip for empty, 1 byte, 32768 bytes, invalid UTF-8. Flip each byte of a short ciphertext, and of the nonce: every one fails. Change project, environment or secret id: each fails. Encrypt under v1, activate v2: still decrypts, new results report 2. 10000 nonces unique. NIST AES-256-GCM known-answer vector passes. Handlers with fake ports: malformed JSON and bad base64 400; absent, wrong or prefix-of-correct token 401 **and the use case not invoked**; 65 KB body 413; a panic -> 500 without detail. Full-stack test captures log output while processing canary `CANARY-9f3c` (raw and base64) and asserts neither appears on success or on any failure.
- [ ] **Step 2:** FAIL, then implement. `crypto/aes` + `cipher.NewGCM`; token compare `subtle.ConstantTimeCompare` on SHA-256 sums; `gin.New()` (no default logger), release mode, `SetTrustedProxies(nil)`; every response `Cache-Control: no-store`.
- [ ] **Step 3:** `scripts/go.sh vet ./... && scripts/go.sh test -race ./...`: `ok`. Rebuild the stack; smoke passes. Commit `feat(engine): AES-256-GCM adapters and authenticated HTTP API`.

### Task 10: NestJS cryptography adapter

**Files:** `apps/api/src/modules/secrets-management/application/ports/output/encryption.port.ts`, `infrastructure/adapters/output/cryptography/go-crypto.adapter.ts`, its spec, `apps/api/test/go-crypto.e2e-spec.ts`, `apps/api/test/support/engine.ts`

**Interfaces:**
- Produces: `EncryptionPort { encrypt(ctx: EncryptionContext, plaintext: string): Promise<EncryptedValue>; decrypt(ctx, value: EncryptedValue): Promise<string> }` with `EncryptionContext {projectId, environmentId, secretId}`; `EncryptedValue.create({ciphertext: Uint8Array, nonce: Uint8Array, keyVersion: number})` (nonce 12, ciphertext >= 16, version >= 1; domain VO in `domain/value-objects/encrypted-value.vo.ts`); errors `ENCRYPTION_UNAVAILABLE` (unavailable), `SECRET_INTEGRITY_FAILURE` (internal); `startEngine()` test helper building the Dockerfile with Testcontainers and generated keys.

- [ ] **Step 1: Failing tests** against a local stub server: token and correlation id sent; connection refused, 500, 401, invalid JSON, and wrong-shape 200 -> `ENCRYPTION_UNAVAILABLE`; a server that never answers -> the same within `ENGINE_TIMEOUT_MS` + 500 ms; 422 -> `SECRET_INTEGRITY_FAILURE`; no error message or `cause` chain contains the plaintext. Against the real engine container: round trip of `'áé🔐\n'`; decrypting with another environmentId -> `SECRET_INTEGRITY_FAILURE`.
- [ ] **Step 2:** FAIL, then implement with global `fetch` and `AbortSignal.timeout`, no retries, redirects rejected. Add engine reachability to `/ready`.
- [ ] **Step 3:** Run `npm test -w apps/api && npm run test:e2e -w apps/api`. PASS. Commit `feat(api): engine cryptography adapter`.

### Task 11: Secrets domain and use cases

**Files:** `apps/api/src/modules/secrets-management/{domain,application}/**` with specs

**Interfaces:**
- Produces: `SecretKey.create`, `SecretValue.create` (toString/toJSON/inspect -> `[REDACTED]`, `.reveal()`), `Secret.create / replaceValue(EncryptedValue, now) / recordAccess(now) / markDeleted(now)`; events `SecretCreated|SecretUpdated|SecretAccessed|SecretDeleted {projectId, environmentId, secretId, key}`; `SecretRepository {add, save, remove, findById(environmentId,id), findByKeys(environmentId, keys|null, limit), listMetadata(environmentId)}`; ports as D§4; `SecretAccessPolicy.assert(ctx, projectId, environmentId, permission): Promise<void>` (application service); `SecretMetadata {id,key,encryptionKeyVersion,createdAt,updatedAt}`, `RevealedSecret = SecretMetadata & {value: string}`.

- [ ] **Step 1: Failing unit tests** with fakes. Keys: `DB_URL`, `_X` ok; `db`, `1A`, `A-B`, empty, 129 characters rejected. Values: `''`, `'a\n'`, emoji and exactly 32768 bytes pass and come back identical; 32769 bytes (including a multibyte case under 32768 characters) and `'\ud800'` rejected (Review Focus 2). `util.inspect`, `JSON.stringify` and template literals of `SecretValue` show `[REDACTED]`. `encrypt` is called outside `UnitOfWork`, before `add`; encryption failure -> `add` never called. Retrieve: publisher failure -> rejects, value not returned. Bulk: one `SecretAccessed` per secret; one failed decryption -> whole request fails; 101 matches -> invalid `TOO_MANY_SECRETS`; unknown requested key -> not_found listing key names only. Policy table: owner ok; other user not_found; key of another project not_found; environment outside project not_found; key without grant forbidden; READ key writing forbidden; WRITE-only key reading forbidden.
- [ ] **Step 2:** `npm test -w apps/api` FAIL, implement, PASS; `npm run arch` PASS. Commit `feat(api): secrets domain and use cases`.

### Task 12: Secrets persistence and HTTP

**Files:** `apps/api/src/modules/secrets-management/infrastructure/**`, `packages/contracts/src/secrets.ts`, `apps/api/test/secrets.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 11 ports. Produces: the `/secrets` routes of D§8 except `/machine`; contracts `createSecretRequest {key,value}`, `updateSecretRequest {value}`, `SecretMetadataResponse`, `SecretValueResponse`.

- [ ] **Step 1: Failing e2e tests** with the real engine. CRUD and bulk; the Review Focus 2 values round-trip byte-identically through HTTP; list JSON contains neither `value` nor `encryptedValue` nor `nonce`; the raw row does not contain the plaintext bytes; storing one value twice gives different ciphertext and nonce. **20 concurrent creates of one key -> one 201, nineteen 409.** Copying ciphertext+nonce from secret A's row to B's -> reading B is 500 `SECRET_INTEGRITY_FAILURE` with no detail. Engine stopped: create and reveal 503 in under 3.5 s, no row added, list 200 (Review Focus 3). Cross-user matrix over all routes: 404. Update after delete: 404. Values carry `Cache-Control: no-store`. An `updateSecretRequest` with an extra `key` -> 400. Canary value absent from captured stdout for success, validation error, 409 and 503.
- [ ] **Step 2:** FAIL, implement (declare `values` before `:secretId`; mapper `Uint8Array` <-> `Bytes`; bulk decrypt concurrency 10), PASS with `npm run arch`. Commit `feat(api): secrets over HTTP`.

**Phase 3 gate:** all suites, smoke extended to store and reveal a secret through `:8080`. Write SECURITY.md encryption and key-management sections. Report.

---

# PHASE 4: API Keys and Audit

### Task 13: Audit Management

**Files:** `apps/api/src/modules/audit-management/**`, `packages/contracts/src/audit.ts`, `apps/api/test/audit.e2e-spec.ts`

**Interfaces:**
- Consumes: all domain events, `ListOwnedProjectIdsPort`.
- Produces: `AuditEntry.record(...)`; `AuditAction` = the brief's seven + D§10's four; `AuditMetadata.create(record)` allows only `key, name, environmentName, apiKeyId, apiKeyPrefix, grants`; `AuditRepository {append, list(query)}`; `AuditLogResponse {id,action,actor:{type:'user'|'apiKey',id},projectId,environmentId,resourceType,resourceId,ipAddress,metadata,createdAt}`; page `{items, nextCursor}`.

- [ ] **Step 1: Failing unit tests.** `AuditMetadata.create({value:'x'})` throws. Event -> action mapping table covers every event.
- [ ] **Step 2: Failing e2e tests.** Each operation writes exactly one entry with actor and IP; a failing append rolls back the secret insert and makes reveal return 500 without the value; a failed (404/403) read writes none; filters by action and project; paging over 30 rows sharing one `createdAt` yields each once; Bob sees none of Alice's, and filtering by her project id gives 200 with an empty list; after project deletion its owner still sees the entries; a canary value is absent from `audit_logs::text`.
- [ ] **Step 3:** FAIL, implement (keyset on `(created_at, id)`, opaque base64url cursor, invalid cursor 400), PASS with `npm run arch`. Commit `feat(api): transactional audit log`.

### Task 14: API key domain, lifecycle and HTTP

**Files:** `apps/api/src/modules/api-key-management/**`, `packages/contracts/src/api-keys.ts`, `apps/api/test/api-keys.e2e-spec.ts`

**Interfaces:**
- Produces: `ApiKey.issue({id,projectId,name,hash,prefix,grants,expiresAt,now})`, `.revoke(now)`, `.isUsable(now)`; events `ApiKeyCreated|ApiKeyRevoked {projectId, apiKeyId, prefix, grants}`; `ApiKeyGenerator.generate(): {plaintext, hash, prefix}` (prefix = first 11 characters) and `.hash(plaintext)`; `ApiKeyRepository {add, save, findById, findByHash, listByProject, touchLastUsed(id, now)}`; ports of D§4; `AuthenticateApiKey` bound as `ApiKeyAuthenticator`; contracts `createApiKeyRequest {name, expiresAt: ISO|null, grants:[{environmentId, permissions[]}]}`, `ApiKeyResponse`, `CreatedApiKeyResponse = ApiKeyResponse & {plaintext}`.

- [ ] **Step 1: Failing unit tests.** No grants, duplicate environment, empty permissions, or past expiry rejected; `isUsable` false at exactly `expiresAt`; revoke twice -> `API_KEY_ALREADY_REVOKED`. Generator: `^mv_[A-Za-z0-9_-]{43}$`, 1000 unique. Rotate keeps name, grants and expiry, revokes the old one, both in one transaction; rotating a revoked or expired key is rejected.
- [ ] **Step 2: Failing e2e tests.** Plaintext present only in create and rotate responses (`no-store`), absent from list, database text and stdout; grant to another project's environment 404; non-owner 404 everywhere; an API key calling `/projects` or `/api-keys` 403; audit entries for create and revoke; revoked key 401 on the next call. `lastUsedAt` set on use and not rewritten within 60 s.
- [ ] **Step 3:** FAIL, implement (`touchLastUsed` = conditional `updateMany`, failure logged and ignored), PASS with `npm run arch`. Commit `feat(api): api key lifecycle`.

### Task 15: Machine access and authorization matrix

**Files:** `apps/api/src/modules/secrets-management/infrastructure/adapters/input/http/machine-secrets.controller.ts`, `apps/api/test/{machine-access,isolation}.e2e-spec.ts`

- [ ] **Step 1: Failing tests.** `GET /machine/secrets?environment=PRODUCTION` -> `{"environment":"PRODUCTION","secrets":{"KEY":"value"}}`; with a user JWT 403. Matrix {no credential, garbage key, revoked, expired, other project, no grant, READ, WRITE, READ+WRITE, owner, stranger} x {list, reveal, bulk, machine, create, update, delete}: table of expected statuses as data. A valid JWT plus an invalid `X-API-Key` -> 401. Audit entry for machine access has `userId` null and `metadata.apiKeyId`. Project deleted -> key 401; environment deleted -> machine call 404 and the key's other environments still work; audit remains readable (Review Focus 5). `isolation.e2e-spec.ts` enumerates every registered route (from the generated OpenAPI document) and fails if a non-public one lacks an isolation case or answers anonymous callers with anything but 401.
- [ ] **Step 2:** FAIL, implement the thin controller over `RetrieveSecretsPort`, PASS with `npm run arch`. Commit `feat(api): machine secret retrieval and authorization matrix`.

**Phase 4 gate:** all suites + smoke using a real API key via curl. Swagger: every route documented with both security schemes (assert in e2e). Update API.md, SECURITY.md. Report.

---

# PHASE 5: Frontend

Load `frontend-design` and `vercel-react-best-practices` before each task. Direction is fixed by D§9; do not choose another anchor. Vercel rules that apply: lazy route modules, parallel queries instead of waterfalls, direct imports (no barrels; Lucide per icon), derived state during render, `useDeferredValue` for search, no components defined inside components, ternaries for conditionals, `Map`/`Set` lookups.

### Task 16: Design system, API client and authentication

**Files:** `apps/web/src/{index.css,components/ui/*,components/layout/*,services/api-client.ts,services/query-client.ts,features/auth/*,routes/*}`, `apps/web/src/test/*`

**Interfaces:**
- Produces: `api<T>(path, init?): Promise<T>` (same-origin cookie, throws `ApiError {status, code, message, correlationId}`); `createQueryClient()` (no persistence, `retry` false on 4xx); `useSession(): {user, login, register, logout}`; `<EmptyState>`, `<ErrorState onRetry>`, `<LoadingRows>`, `<ConfirmDialog requireText?>`; `<AppShell>`; route guard.

- [ ] **Step 1: Failing tests** (Vitest, RTL, MSW). Login success -> dashboard; 401 -> "Email or password is incorrect."; 429 -> wait message; register field errors from shared zod schemas; unauthenticated deep link -> login -> back to the link; login only redirects to same-app paths (`?next=//evil.test` ignored); logout clears the query cache. A CSS test asserts no `border-radius` token other than 0, no `box-shadow`, font stack Plex Mono, and `--signal: #FFB800`.
- [ ] **Step 2:** FAIL, implement, PASS. Verify keyboard-only login and AA contrast. Commit `feat(web): design system and authentication`.

### Task 17: Dashboard and projects

**Files:** `apps/web/src/features/{dashboard,projects}/*`, routes `/`, `/projects`, `/projects/:projectId`

- [ ] **Step 1: Failing tests.** Dashboard sums counts from `GET /projects`, shows the 10 latest audit entries, and issues both requests in parallel; zero projects -> empty state with "Create project". Create modal: validation, 409 shown on the name field, success navigates to the project. Edit. Delete requires typing the project name. Loading, error with retry, and a 404 project page.
- [ ] **Step 2:** FAIL, implement, PASS, responsive at 360 and 1440 px. Commit `feat(web): dashboard and projects`.

### Task 18: Environments and secrets

**Files:** `apps/web/src/features/{environments,secrets}/*`, `apps/web/src/features/secrets/revealed-secrets-context.tsx`, route `/projects/:projectId/:environmentName`

**Interfaces:**
- Produces: `useRevealedSecrets(): {values: ReadonlyMap<string,string>; reveal(id, value); hide(id); hideAll(); count}`; `REVEAL_TTL_MS = 30000`.

- [ ] **Step 1: Failing tests.** Tabs switch by URL. Values masked with a fixed-length mask that does not depend on the real length. Reveal fetches on click only, shows the value and header "1 value revealed"; hidden after 30 s (fake timers), on environment or project change, on `visibilitychange` hidden, on logout, on "Hide all". Reveal resolving **after** the user left the environment is discarded. Copy fetches, writes to the clipboard, does not reveal; clipboard rejection shows an error. After reveal, edit and copy, the canary is absent from the serialized query cache, mutation cache, localStorage, sessionStorage and console spies. Create: key validation, multi-line value, 409 on key. Edit starts empty (never prefilled). Delete confirms. Search filters by key. 503 -> "Encryption service is unavailable. Try again." **401 mid-edit -> login with "Your session expired. Sign in again.", revealed map empty (Review Focus 4).**
- [ ] **Step 2:** FAIL, implement (reveal and value mutations call `api` directly or use `gcTime: 0` mutations reset on settle), PASS. Commit `feat(web): environments and secrets`.

### Task 19: API keys and audit logs

**Files:** `apps/web/src/features/{api-keys,audit}/*`, routes `/projects/:projectId/api-keys`, `/audit`

- [ ] **Step 1: Failing tests.** Generate: name, expiry (30/90/365 days, never), per-environment read/write; submitting without any permission shows an error; key displayed once in amber with copy, gone after close, absent from caches; closing without copying asks for confirmation. Status column: active, expired, revoked; permissions and last used shown. Revoke and rotate confirm. Audit: timeline grouped by day, filters by action and project in the URL, "Load more" by cursor, machine actors shown by key name or prefix, empty state when a filter matches nothing.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): api keys and audit`.

**Phase 5 gate:** web tests, build; drive the real stack in a browser through register -> project -> secret -> reveal -> key -> curl with key -> audit. Run the frontend-design §5 checklist and `web-design-guidelines`. Capture screenshots into `docs/screenshots/`. Report.

---

# PHASE 6: Quality

### Task 20: Seed, security suite and CI

**Files:** `apps/api/src/seed.ts`, `docker-compose.yml` (profile `demo`), `apps/api/test/security.e2e-spec.ts`, `.github/workflows/ci.yml`, `scripts/verify.sh`

- [ ] **Step 1: Failing tests.** Seed creates `demo@minivault.local` with `DEMO_USER_PASSWORD`, two projects, secrets with obviously fake values, one key; running it twice changes nothing; plaintext key is printed once, to stdout of the seed only. Security suite: SQL metacharacters in every string input and query parameter -> 4xx or literal storage; security headers present; CORS refuses a foreign origin; `x-powered-by` absent; spoofed `X-Forwarded-For` through nginx does not change the audited IP; repository scan finds no PEM, `mv_` key, or 32-byte base64 literal outside fixtures.
- [ ] **Step 2:** FAIL, implement (seed uses input ports through `createApplicationContext`), PASS. `scripts/verify.sh` runs build, lint, arch, every test suite, `npm audit --omit=dev --audit-level=high`, `govulncheck`, compose up, smoke. CI runs the same script.
- [ ] **Step 3:** Commit `feat: demo data, security suite and CI`.

### Task 21: Documentation and final verification

**Files:** `README.md`, `docs/{ARCHITECTURE,SECURITY,API,DEVELOPMENT}.md`

- [ ] **Step 1:** Complete every heading the brief's §14 lists, with a Mermaid architecture diagram and the experimental/portfolio disclaimer near the top of README. SECURITY.md includes D§11, the KMS/HSM replacement path, nonce limits, key rotation procedure and `.env` backup warning.
- [ ] **Step 2:** Verify from a clean clone in a temporary directory following only README. Compose project name `minivault-verify` and `WEB_PORT=8089`, so the existing stack and volumes are untouched. Expected: the app works; `scripts/verify.sh` exits 0.
- [ ] **Step 3:** Walk brief §16 and §17 line by line; record the proving test or command for each in `docs/ARCHITECTURE.md` under "Acceptance evidence". Anything unproven is listed as a known limitation, not claimed.
- [ ] **Step 4:** Commit `docs: complete documentation and acceptance evidence`.

**Phase 6 gate:** `scripts/verify.sh` exits 0 and its summary is included in the final report.
