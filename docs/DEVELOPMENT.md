# Development

## Start everything

```sh
sh scripts/init-env.sh        # once; creates .env with random credentials
docker compose up --build     # http://localhost:8080
```

`sh scripts/smoke.sh` checks health and network isolation of a running stack.

## Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install dependencies |
| `npm run build` / `lint` / `typecheck` | Static checks |
| `npm test` | Unit, architecture and web tests |
| `npm run test:e2e` | API integration tests; starts PostgreSQL and the engine with Testcontainers |
| `npm run arch` | Dependency rules of the API |
| `npm run engine:test` / `engine:vet` | Go, in a container |
| `sh scripts/verify.sh` | All of the above, a vulnerability scan, and an end-to-end run on a throwaway stack (project `minivault-verify`, port 8089) |

`sh scripts/flow.sh` walks the product end to end. It creates a user, so run it only against a throwaway stack.

## Database changes

Edit `apps/api/prisma/schema.prisma`, then with `DATABASE_URL` pointing at a disposable database run `npx prisma migrate dev --name <name>` in `apps/api`. Keep `prisma` pinned: npm's `latest` is a release candidate of the next major version.

## Adding a use case

1. Domain rule and its test.
2. Input port, use case and its test with fakes.
3. Adapter, binding in the module, integration test.
4. New routes are found by `isolation.e2e-spec.ts`, which fails until they are covered.
