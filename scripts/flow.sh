#!/bin/sh
# Walks the product end to end through nginx. Creates a user: use a throwaway stack.
set -eu
BASE="http://localhost:${WEB_PORT:-8080}/api/v1"
JSON='Content-Type: application/json'
fail() { echo "FLOW FAILED: $1" >&2; exit 1; }
field() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).$1))"; }
EMAIL="flow-$(date +%s)@example.test"; PASSWORD=$(openssl rand -hex 12); VALUE="flow-$(openssl rand -hex 8)"

curl -fsS "$BASE/auth/register" -H "$JSON" -d "{\"name\":\"Flow\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
TOKEN=$(curl -fsS "$BASE/auth/login" -H "$JSON" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | field accessToken)
AUTH="Authorization: Bearer $TOKEN"
PROJECT=$(curl -fsS "$BASE/projects" -H "$AUTH" -H "$JSON" -d '{"name":"Flow"}' | field id)
ENVIRONMENT=$(curl -fsS "$BASE/projects/$PROJECT/environments" -H "$AUTH" | field "find(e=>e.name==='PRODUCTION').id")
SECRETS="$BASE/projects/$PROJECT/environments/$ENVIRONMENT/secrets"
SECRET=$(curl -fsS "$SECRETS" -H "$AUTH" -H "$JSON" -d "{\"key\":\"FLOW_KEY\",\"value\":\"$VALUE\"}" | field id)
[ "$(curl -fsS "$SECRETS/$SECRET" -H "$AUTH" | field value)" = "$VALUE" ] || fail "the secret did not round-trip"
KEY=$(curl -fsS "$BASE/projects/$PROJECT/api-keys" -H "$AUTH" -H "$JSON" \
  -d "{\"name\":\"flow\",\"expiresAt\":null,\"grants\":[{\"environmentId\":\"$ENVIRONMENT\",\"permissions\":[\"SECRETS_READ\"]}]}" | field plaintext)
MACHINE="$BASE/machine/secrets?environment=PRODUCTION"
[ "$(curl -fsS "$MACHINE" -H "X-API-Key: $KEY" | field secrets.FLOW_KEY)" = "$VALUE" ] || fail "the API key could not read the secret"
KEY_ID=$(curl -fsS "$BASE/projects/$PROJECT/api-keys" -H "$AUTH" | field "at(0).id")
curl -fsS -X DELETE "$BASE/projects/$PROJECT/api-keys/$KEY_ID" -H "$AUTH"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$MACHINE" -H "X-API-Key: $KEY")" = 401 ] || fail "a revoked key still works"
ADDRESS=$(curl -fsS "$BASE/projects" -H "$AUTH" -H "$JSON" -H 'X-Forwarded-For: 6.6.6.6' -d '{"name":"Address"}' >/dev/null \
  && curl -fsS "$BASE/audit-logs?action=PROJECT_CREATED&limit=1" -H "$AUTH" | field "items[0].ipAddress")
[ "$ADDRESS" != 6.6.6.6 ] || fail "a client can choose the audited address"
ACTIONS=$(curl -fsS "$BASE/audit-logs?limit=100" -H "$AUTH" | field "items.map(i=>i.action).join()")
for action in PROJECT_CREATED SECRET_CREATED SECRET_ACCESSED API_KEY_CREATED API_KEY_REVOKED; do
  case "$ACTIONS" in *"$action"*) ;; *) fail "$action was not audited";; esac
done
if docker compose logs --no-color 2>/dev/null | grep -qF -e "$VALUE" -e "$KEY" -e "$PASSWORD" -e "$TOKEN"; then fail "a secret is in the logs"; fi
DUMP=$(docker compose exec -T postgres pg_dump -U minivault minivault)
for needle in "$VALUE" "$KEY" "$PASSWORD"; do
  if printf '%s' "$DUMP" | grep -qF -e "$needle"; then fail "plaintext is in the database"; fi
done
echo "FLOW OK"
