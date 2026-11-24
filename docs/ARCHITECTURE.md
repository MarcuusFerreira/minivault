# Architecture

The accepted design is [the architecture proposal](superpowers/specs/2026-11-24-minivault-design.md). This document describes what is implemented and grows with each phase.

## Services

| Service | Responsibility | Networks |
|---|---|---|
| web (nginx) | Serves the SPA, proxies `/api` | edge, app |
| api (NestJS) | Identity, authorization, persistence, audit. Holds no master key | app, data, crypto |
| secrets-engine (Go) | Holds master keys, performs AES-256-GCM | crypto |
| postgres | Persistence | data |

`app`, `data` and `crypto` are internal Docker networks. Nothing but the API can reach the engine.

## Dependency rule

`infrastructure -> application -> domain`, in both backends.

- API: `apps/api/.dependency-cruiser.cjs`, proven by fixtures in `apps/api/test/architecture`.
- Engine: `services/secrets-engine/internal/architecture_test.go`.
