# MiniVault Architecture Proposal

Resolves the open decisions in [the brief](2026-11-24-minivault-brief.md). Where this document is silent, the brief governs. Deviations from the brief are listed in §10.

## 1. Environment inspection

| Item | Finding | Consequence |
|---|---|---|
| Repository | Empty except `.claude/skills`; not a git repository | Greenfield. `git init` in Task 1 |
| Node / npm | 24.22 / 11.19; no pnpm | npm workspaces |
| Go | Not installed | Every Go command runs in `golang:1.27` through `scripts/go.sh` |
| Docker / Compose | 29.1 / 2.40, working | Testcontainers usable |
| Occupied ports | 3067, 13068, 15432, 18012-18018, 18080, 19001-19002, 25672-25673 | The only published port is `WEB_PORT`, default 8080 (free) |
| NestJS | 12.6, ESM-only, scaffolds Vitest | Jest is kept (the brief requires it). Verified: Jest 30 + `@swc/jest` + `--experimental-vm-modules` runs Nest 12 with Supertest |
| Prisma | npm `latest` is 8.0.0-**rc** | Pin 7.10.1. Verified: ESM client, `@prisma/adapter-pg`, rollback of a transaction carried in AsyncLocalStorage, `P2002` on duplicates |
| TypeScript | `latest` is 7.0; Swagger accepts `^5.5 \|\| ^6`, typescript-eslint `<6.1` | Pin 5.9.3 |

## 2. System

```text
Browser ──► web (nginx: SPA + /api proxy) ──► api (NestJS) ──► secrets-engine (Go)
                                                 │
                                                 └──► postgres
networks:  edge: web     app (internal): web, api
           data (internal): api, migrate, postgres     crypto (internal): api, secrets-engine
```

Only `web` publishes a port. `secrets-engine` is attached to `crypto` alone, so the browser, nginx and the database have no route to it.

- **api** owns identity, authorization, persistence, audit. Never holds a master key.
- **secrets-engine** owns master keys and AES-256-GCM. Stateless, no database, makes no authorization decision about users.

Neither PostgreSQL access alone nor engine access alone yields plaintext.

## 3. Bounded contexts and aggregates

| Context | Aggregate root | Why this boundary | Key invariants |
|---|---|---|---|
| identity-access | `User` | Independent lifecycle | Email normalized (trim + lowercase), unique; password 12-128 chars; only an Argon2id hash is held |
| project-management | `Project` | Name/description change together; does not load environments | Name 1-100 trimmed, unique per owner; owner never changes |
| environment-management | `Environment` | Secrets refer to it by id; adding secrets must not lock the project | Name in {DEVELOPMENT, STAGING, PRODUCTION}; unique per project |
| secrets-management | `Secret` | Each secret changes alone; an environment aggregate would serialize unrelated writes | Key matches `^[A-Z_][A-Z0-9_]{0,127}$`, immutable, unique per environment; ciphertext, nonce and key version replaced together |
| api-key-management | `ApiKey` (owns `EnvironmentGrant` value objects) | Key and grants must be consistent together | At least one grant at creation; expiry in the future at creation; revocation is final |
| audit-management | `AuditEntry` | Append-only | Immutable; metadata restricted to an allow-list of keys |
| cryptographic-operations (Go) | none; stateless value objects + `EncryptionContext` | No persisted state | Key 32 bytes, nonce 12 bytes, ciphertext >= 16 bytes, version >= 1 |

"Encryption Key Management" is **not** a separate Go context. Keys have no business lifecycle here (nobody creates or retires them through the product), so it is an output port plus an adapter.

### Cross-context rules

1. A context may call another only through **its own output port**, implemented by an infrastructure adapter that calls the other context's **input port**. Imports between modules are legal only from `infrastructure/` to another module's `application/ports/input/`.
2. Module dependencies are acyclic: `identity`, `project` <- `environment` <- `secrets`, `api-key`; `audit` -> `project`.
3. Domain events use an in-process synchronous bus, dispatched **inside the caller's transaction**. Two real uses: `ProjectCreated` makes environment-management create three environments; every sensitive event makes audit-management append an entry. A failing subscriber rolls back the business change. No broker. Event classes live in `shared/domain/events` as the published language, so a subscriber never imports another context's domain.

## 4. Ports and adapters (NestJS)

Use cases are plain classes (no decorators), bound with `useFactory`. Input ports are interfaces with a `Symbol` token. Repository interfaces live in `domain/repositories`; other output ports in `application/ports/output`.

| Context | Input ports | Output ports -> adapters |
|---|---|---|
| identity-access | RegisterUser, Login, AuthenticateUser, GetCurrentUser | UserRepository -> Prisma; PasswordHasher -> Argon2; AccessTokenService -> @nestjs/jwt |
| project-management | CreateProject, ListProjects, GetProject, UpdateProject, DeleteProject, AuthorizeProjectAccess, ListOwnedProjectIds | ProjectRepository -> Prisma; ProjectStatisticsQuery -> Prisma read model |
| environment-management | CreateEnvironment, ListEnvironments, GetEnvironment, DeleteEnvironment, ProvisionDefaultEnvironments | EnvironmentRepository -> Prisma; ProjectAccess -> project context |
| secrets-management | StoreSecret, UpdateSecret, RetrieveSecret, RetrieveSecrets, ListSecretMetadata, DeleteSecret | SecretRepository -> Prisma; Encryption -> Go HTTP client; ProjectAccess; EnvironmentDirectory |
| api-key-management | GenerateApiKey, RotateApiKey, RevokeApiKey, ListApiKeys, AuthenticateApiKey | ApiKeyRepository -> Prisma; ApiKeyGenerator -> node:crypto; ProjectAccess; EnvironmentDirectory |
| audit-management | RecordAuditEvent, ListAuditLogs | AuditRepository -> Prisma; OwnedProjects -> project context |
| shared | none | UnitOfWork, DomainEventPublisher, Clock, IdGenerator, UserAuthenticator, ApiKeyAuthenticator |

Input adapters: HTTP controllers, the event subscribers, and the seed script. `ProjectStatisticsQuery` is a read-only CQRS query counting rows across tables for the dashboard; this avoids an artificial "dashboard" context and a module cycle.

Go: input ports `EncryptSecret`, `DecryptSecret`; output ports `Cipher` (AES-GCM adapter), `KeyProvider` (environment adapter), `NonceGenerator` (crypto/rand adapter).

## 5. Authentication and authorization

- **Principal** = user or API key, produced by one global guard (secure by default; `@Public()` and `@AllowApiKey()` opt out/in).
- **JWT:** HS256 pinned, issuer/audience checked, TTL 1800 s, user re-read on each request. API clients use `POST /auth/login` (token in body). The browser uses `POST /auth/session`, which puts the same JWT in an `HttpOnly; SameSite=Strict` cookie and returns only the user, so no script can read it. Cookie-authenticated unsafe methods must carry an `Origin` equal to `WEB_ORIGIN`.
- **API keys:** `mv_` + base64url(32 random bytes). SHA-256 stored and looked up through a unique index. A slow hash adds nothing against 256-bit random input and would be a DoS lever. Precedence: if `X-API-Key` is present it is the only credential considered.
- **Authorization** is decided in use cases, not guards: ownership for users; for API keys, project equality plus a grant on the environment (`SECRETS_READ` or `SECRETS_WRITE`; WRITE does not imply READ).
- **Not yours = 404**, never 403, so ids cannot be probed. An API key lacking a grant inside its own project gets 403. API keys get 403 on routes without `@AllowApiKey()`.

## 6. Encryption

**Write:** authorize -> generate secret id -> engine encrypts -> transaction { insert; event -> audit }. The HTTP call is never inside a transaction.
**Read:** authorize -> load -> engine decrypts -> write SECRET_ACCESSED -> return. If the audit write fails, the value is **not** returned.

**AAD:** `minivault:v1|project=<uuid>|environment=<uuid>|secret=<uuid>` with canonical lowercase UUIDs. The brief asks for project and environment; the secret id also stops swapping two ciphertexts inside one environment. Consequence: secret keys cannot be renamed (delete and recreate), and neither can rows be moved between environments.

**Nonce:** 96-bit from `crypto/rand` per operation. Random nonces are collision-safe in practice, not by proof: stay below 2^32 encryptions per key version, then activate a new version.

**Keys:** `MASTER_KEYS=1:<base64>,2:<base64>` and `ACTIVE_KEY_VERSION`. Old versions stay for decryption. A KMS/HSM replaces the `KeyProvider` adapter (envelope encryption: the KMS unwraps a data key per version); domain and application do not change.

**Service auth:** `Authorization: Bearer <ENGINE_AUTH_TOKEN>` (>= 32 chars), compared in constant time over SHA-256 digests. Plain HTTP inside the isolated network; mTLS is the documented production step.

## 7. Data model

UUID primary keys, `timestamptz`. Tables: `users` (unique email), `projects` (unique ownerId+name), `environments` (unique projectId+name; check on name), `secrets` (unique environmentId+key; `encrypted_value bytea`, `nonce bytea` check length 12), `api_keys` (unique key_hash), `api_key_grants` (PK apiKeyId+environmentId+permission), `audit_logs`.

Cascade: project -> environments -> secrets, grants; project -> api_keys -> grants. `audit_logs` has **no foreign keys**, so history outlives what it describes, plus a trigger rejecting UPDATE and DELETE. Indexes on `audit_logs(project_id, created_at desc, id)` and `(user_id, created_at desc, id)`; `secrets(environment_id)`; `api_keys(project_id)`. Visibility: entries whose project the user owns, or whose `user_id` is the user (covers deleted projects).

## 8. HTTP API (`/api/v1`)

| Method and path | API key? |
|---|---|
| POST `/auth/register`, `/auth/login`, `/auth/session`; DELETE `/auth/session`; GET `/auth/me` | no |
| GET, POST `/projects`; GET, PATCH, DELETE `/projects/:projectId` | no |
| GET, POST `/projects/:projectId/environments`; GET, DELETE `.../:environmentId` | no |
| GET, POST `/projects/:p/environments/:e/secrets` (GET: metadata only) | yes |
| GET `.../secrets/values?keys=A,B` (max 100; all when omitted, 422 above 100) | yes |
| GET, PATCH, DELETE `.../secrets/:secretId` (GET: includes value) | yes |
| GET `/machine/secrets?environment=PRODUCTION` (project comes from the key) | only |
| GET, POST `/projects/:p/api-keys`; POST `.../:id/rotate`; DELETE `.../:id` (revoke) | no |
| GET `/audit-logs?projectId&action&cursor&limit` (limit default 25, max 100) | no |

Outside the prefix: `/health` (liveness), `/ready` (database + engine), neither proxied by nginx except `/health`. Swagger at `/api/docs`. Error shape everywhere: `{"error":{"code","message","correlationId","details?"}}`. Every response carries `X-Correlation-Id`, forwarded to the engine. Secret-bearing responses carry `Cache-Control: no-store`.

## 9. Frontend direction

Skills: `frontend-design` and `vercel-react-best-practices` (SPA-relevant rules; no Next.js/server rules).

> **Superseded:** after review the owner found the Industrial anchor too square. The interface now uses slate surfaces separated by tone, soft corners, Instrument Sans, and IBM Plex Mono only for code. The differentiator below is unchanged, except that the indicator is a floating pill and the amber is `#FFB84D`.

**Anchor: Industrial.** The brief fixes dark-first, minimalist and developer-oriented, so the unexpectedness goes into the signal rather than the surface. Warm-black `#0B0C0A`, IBM Plex Mono everywhere (self-hosted), 1 px borders, zero radius, no shadows, no grain, tabular numerics. shadcn primitives are restyled to those tokens.

**Differentiator: color means exposure.** Amber `#FFB800` is the only color in the interface and appears only while plaintext is on screen: a revealed secret row, a newly created API key, and a header counter ("2 values revealed") whose button hides them all. At rest the product is monochrome. Errors and destructive actions use icon + text + inverted contrast, never hue. Focus rings are white.

Standard UI copy, Lucide icons only, no fabricated data, no filler labels.

Revealed values live in component state behind one `RevealedSecretsContext`, never in the TanStack cache; cleared on logout, project change, environment change, tab hide, and 30 s after reveal.

## 10. Deviations from the brief

| Change | Reason |
|---|---|
| `ApiKey.revokedAt`, `keyPrefix` added | Revoked keys must stay visible and identifiable; hashes are not displayable |
| `permissions` stored as `api_key_grants` rows | Foreign keys guarantee grants point at real environments |
| Ports declared once | Avoids the duplicate `secret.repository` / `secret-persistence.port` in the example |
| No Redis | One API instance; throttler state in memory. Documented limitation |
| `@nestjs/authentication` (recommended by the nestjs-auth skill) not used | It brings scrypt and its own services; the brief requires Argon2id behind our own ports |
| Extra audit actions: PROJECT_UPDATED, PROJECT_DELETED, ENVIRONMENT_CREATED, ENVIRONMENT_DELETED | Deleting an environment destroys secrets |

## 11. Security risks

| Risk | Mitigation | Residual |
|---|---|---|
| Database dump | Ciphertext only; keys in engine | Metadata (names) in clear |
| Ciphertext swapped or replayed across rows | AAD incl. secret id | Rolling a row back to its own older ciphertext is undetected |
| API compromise | No master key in API | Attacker can ask the engine to decrypt while inside; audit and rate limits only |
| Cross-tenant access | Ownership check in every use case; isolation test suite; 404 | |
| XSS steals session | HttpOnly cookie, strict CSP | XSS can act as the user while the page is open |
| Plaintext in logs | Bodies never logged; redaction; canary test greps all logs | Process memory, heap dumps |
| Lost `.env` | `init-env.sh` never overwrites; docs require backup | Data is unrecoverable by design |
| Password guessing | 5/min/IP on auth routes; dummy hash for unknown emails | Registration reveals that an email exists |
