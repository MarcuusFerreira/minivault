# API

Base path `/api/v1`. Interactive reference at `/api/docs`, OpenAPI document at `/api/docs-json`.

## Authentication

| Client | How |
|---|---|
| API client | `POST /auth/login` returns `accessToken`; send `Authorization: Bearer <token>` |
| Browser | `POST /auth/session` sets an HttpOnly cookie |
| Application | `X-API-Key: mv_…` |

## Endpoints

| Method and path | API key |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/session`, `DELETE /auth/session` | public |
| `GET /auth/me` | no |
| `GET, POST /projects` and `GET, PATCH, DELETE /projects/:projectId` | no |
| `GET, POST /projects/:projectId/environments` and `GET, DELETE .../:environmentId` | no |
| `GET, POST /projects/:projectId/environments/:environmentId/secrets` | read, write |
| `GET .../secrets/values?keys=A,B` | read |
| `GET .../secrets/:secretId` | read |
| `PATCH, DELETE .../secrets/:secretId` | write |
| `GET /machine/secrets?environment=PRODUCTION&keys=A,B` | read, API key only |
| `GET, POST /projects/:projectId/api-keys`, `POST .../:apiKeyId/rotate`, `DELETE .../:apiKeyId` | no |
| `GET /audit-logs?projectId&action&cursor&limit` | no |

Listing secrets returns metadata only. Reading several values is all or nothing, at most 100; `keys` is optional and selects some.

Outside the base path: `GET /health` (alive) and, inside the network only, `GET /ready` (database and engine).

## Errors

```json
{ "error": { "code": "SECRET_NOT_FOUND", "message": "Secret not found.", "correlationId": "…", "details": [] } }
```

`details` is present on `VALIDATION_ERROR`. Every response has `X-Correlation-Id`; a request may supply one (8 to 64 letters, digits or dashes).

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Missing or invalid credential |
| 403 | API key without permission, or a rejected origin |
| 404 | Missing, or not yours |
| 409 | Conflict, for example a duplicate name |
| 413 | Body over 256 KB |
| 422 | Too many secrets at once |
| 429 | Rate limited; see `Retry-After` |
| 503 | Encryption service unavailable |

## Limits

Secret key: `^[A-Z_][A-Z0-9_]{0,127}$`. Secret value: up to 32768 bytes of valid Unicode, returned byte for byte. Password: 12 to 128 characters.
