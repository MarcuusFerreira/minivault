#!/bin/sh
# Runs the Go toolchain in a container, so no host installation is needed.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$root/.cache/go/mod" "$root/.cache/go/build"
exec docker run --rm -u "$(id -u):$(id -g)" \
  -e HOME=/tmp -e GOMODCACHE=/cache/mod -e GOCACHE=/cache/build -e GOFLAGS=-modcacherw \
  -v "$root/.cache/go:/cache" -v "$root/services/secrets-engine:/src" -w /src \
  golang:1.27 go "$@"
