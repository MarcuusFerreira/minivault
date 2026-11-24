# Security

MiniVault is experimental and unreviewed. Do not store production secrets in it.

## Threat model

Protected: secret values, API keys, passwords, the integrity of the audit log, and isolation between users.

| Attacker | What stops them | What remains |
|---|---|---|
| Reads the database or a backup | Values are AES-256-GCM ciphertext, API keys SHA-256 hashes, passwords Argon2id hashes. Keys are not in the database | Names of projects, secrets and keys are in clear |
| Writes to the database | The authentication tag binds each value to project, environment and secret | They can delete data, or restore an older ciphertext of the same secret |
| Reaches the Docker network of `web` | The engine is on another network, and requires a service token | |
| Holds another user's valid account | Ownership is checked in every use case; a foreign id answers like a missing one | |
| Holds a leaked API key | Scoped to environments and permissions, expirable, revocable; cannot manage anything | Reads what it was granted until revoked |
| Runs script in the dashboard | HttpOnly cookie, strict CSP, no values in storage or caches | Can act as the user while the page is open |
| Forges a cross-site request | `SameSite=Strict` and an exact `Origin` check on cookie-authenticated changes | |
| Guesses passwords | Argon2id, 5 attempts a minute per address, equal work for unknown emails | Registration reveals whether an email exists |
| Controls the API process | Holds no master key | Can ask the engine to decrypt while it has control |
| Controls the host or the engine | Out of scope | Everything |

Assumptions: the Docker host, its images and the operator's `.env` are trusted; TLS is provided in front of `web`.

## Encryption strategy

- AES-256-GCM from the Go standard library. No custom primitives.
- A fresh 96-bit nonce from `crypto/rand` for each encryption. Random nonces are safe in practice rather than by proof: keep below 2^32 encryptions per key version, then activate a new one.
- Associated data: `minivault:v1|project=<uuid>|environment=<uuid>|secret=<uuid>`. Identifiers have a fixed shape and are lowercased, so the encoding is unambiguous.
- A failed decryption says only that it failed.

## Key management

The engine reads `MASTER_KEYS` from its environment and nothing else stores them. Key objects refuse to be printed by any formatter or logger.

**Rotation.** Append a version to `MASTER_KEYS`, point `ACTIVE_KEY_VERSION` at it, restart the engine. New and updated secrets use the new key; old ones stay readable while their version is listed. A version may be removed only when no row in `secrets` uses it.

**Limits of this development strategy.** Environment variables are visible to whoever can inspect the container. One key protects all projects. Nothing enforces rotation.

**Replacing it.** `KeyProvider` (`application/ports/output`) is the only place keys come from. With a KMS or HSM, an adapter would keep wrapped data keys, have the KMS unwrap them, and cache the result briefly (envelope encryption). Alternatively a `Cipher` adapter could let an HSM perform the operation. Domain and application would not change.

**Backup.** Losing `.env` makes all secrets unrecoverable, by design. `scripts/init-env.sh` never overwrites it.

## API key storage

`mv_` followed by 32 random bytes, returned once. Stored as SHA-256 and looked up by it through a unique index. A slow hash protects guessable input; 256 random bits are not guessable, and a slow hash on every request would help only a denial of service. Eleven characters are kept for display.

## Access control

Authentication is required on every route unless it is explicitly public, and API keys are refused on every route that does not explicitly accept them. One credential is considered, in the order `X-API-Key`, `Authorization`, cookie; an invalid one never falls through.

| Principal | May |
|---|---|
| User | Everything in projects they own |
| API key | Read or write secrets, as granted, in the granted environments of its project |

`SECRETS_WRITE` does not include `SECRETS_READ`. Recreating a deleted environment does not bring grants back. Tests: `isolation.e2e-spec.ts` discovers every route, and `machine-access.e2e-spec.ts` holds the full credential and operation matrix.

## Audit logging

Recorded: project, environment, secret and API key changes, and every read of a value. Entries carry the actor, address and allow-listed metadata, never a value. They are written in the transaction of the operation. A trigger rejects UPDATE and DELETE.

Entries outlive what they describe. After a project is deleted its owner still sees their own actions, but not those of its API keys, since ownership can no longer be shown. Refused attempts are in the request log only.

## Handling of plaintext

- API and engine log route patterns, status and correlation ids; never bodies, headers, query strings or messages of unknown errors. Tests send canary values through success and failure paths and search the output.
- Responses with values carry `Cache-Control: no-store`.
- The dashboard keeps revealed values in component state: 30 seconds, until navigation, sign-out, or the tab is hidden. They never enter TanStack Query, storage or logs.
- Values are not wiped from process memory, and a copied value stays in the clipboard.

## Security limitations

No independent review; no MFA, lockout or email verification; no server-side token revocation; no mTLS between services; in-memory rate limits; no envelope encryption; no detection of rollback to an older ciphertext.
