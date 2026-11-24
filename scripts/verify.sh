#!/bin/sh
# Everything that must hold before a change is accepted. Runs on a throwaway stack.
set -eu
cd "$(dirname "$0")/.."
step() { printf '\n== %s\n' "$1"; }
step build;         npm run build
step lint;          npm run lint && npm run typecheck
step architecture;  npm run arch
step unit;          npm test
step engine;        npm run engine:vet && npm run engine:test
step integration;   npm run test:e2e
step vulnerabilities
sh scripts/go.sh run golang.org/x/vuln/cmd/govulncheck@latest ./...
step stack
sh scripts/init-env.sh
export COMPOSE_PROJECT_NAME=minivault-verify WEB_PORT=8089 WEB_ORIGIN=http://localhost:8089
trap 'docker compose --profile demo down -v >/dev/null 2>&1' EXIT
docker compose down -v >/dev/null 2>&1 || true
docker compose up --build -d --wait
sh scripts/smoke.sh
sh scripts/flow.sh
docker compose --profile demo run --rm seed
docker compose --profile demo run --rm seed | grep -q 'already exists'
step audit
# The runtime image holds no Prisma CLI, which is what npm audit reports.
docker compose exec -T api sh -c '! test -d /app/node_modules/prisma && ! test -d /app/node_modules/effect'
printf '\nVERIFY OK\n'
