#!/bin/sh
# Asserts that the running stack is healthy and isolated as designed.
set -eu
cd "$(dirname "$0")/.."
BASE="http://localhost:${WEB_PORT:-8080}"
fail() { echo "SMOKE FAILED: $1" >&2; exit 1; }
status() { curl -s -o /dev/null -w '%{http_code}' "$1"; }

[ "$(status "$BASE/")" = 200 ] || fail "web is not serving the application"
[ "$(status "$BASE/health")" = 200 ] || fail "api liveness is not reachable through nginx"
[ "$(status "$BASE/projects/some/deep/link")" = 200 ] || fail "client-side routes are not served"

for service in api secrets-engine postgres; do
  id=$(docker compose ps -q "$service"); [ -n "$id" ] || fail "$service is not running"
  published=$(docker inspect -f '{{range $p, $b := .HostConfig.PortBindings}}{{$p}} {{end}}' "$id")
  [ -z "$published" ] || fail "$service publishes ports: $published"
done
for service in web api secrets-engine; do
  user=$(docker inspect -f '{{.Config.User}}' "$(docker compose ps -q "$service")")
  case "$user" in ''|root|0|0:*) fail "$service runs as root";; esac
done

if docker compose exec -T web wget -q -T 3 -O /dev/null http://secrets-engine:8081/health 2>/dev/null; then
  fail "web can reach the secrets engine"
fi
docker compose exec -T api node -e "fetch('http://secrets-engine:8081/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" \
  || fail "api cannot reach the secrets engine"
echo "SMOKE OK"
