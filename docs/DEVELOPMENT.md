# Development

## Start everything

```sh
sh scripts/init-env.sh        # once; creates .env with random credentials
docker compose up --build     # http://localhost:8080
```

Only the web container publishes a port (`WEB_PORT`). `sh scripts/smoke.sh` checks a running stack.

## Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install dependencies |
| `npm run build` / `lint` / `typecheck` | Static checks |
| `npm test` | Unit, architecture and web tests |
| `npm run test:e2e` | API integration tests (needs Docker) |
| `npm run arch` | Dependency rules of the API |
| `npm run engine:test` / `engine:vet` | Go tests and vet, in a container; Go is not needed on the host |
