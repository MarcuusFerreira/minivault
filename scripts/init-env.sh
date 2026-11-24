#!/bin/sh
# Creates .env with random local credentials. Never overwrites an existing file:
# losing MASTER_KEYS makes every stored secret unrecoverable.
set -eu
cd "$(dirname "$0")/.."
if [ -e .env ]; then echo ".env already exists, leaving it unchanged."; exit 0; fi
umask 077
hex() { openssl rand -hex "$1"; }
cat > .env <<EOF
WEB_PORT=8080
WEB_ORIGIN=http://localhost:8080
COOKIE_SECURE=false
POSTGRES_PASSWORD=$(hex 24)
JWT_SECRET=$(hex 32)
ENGINE_AUTH_TOKEN=$(hex 32)
MASTER_KEYS=1:$(openssl rand -base64 32)
ACTIVE_KEY_VERSION=1
DEMO_USER_PASSWORD=$(hex 12)
EOF
echo "Created .env. Back it up: without MASTER_KEYS stored secrets cannot be decrypted."
