#!/usr/bin/env bash
# Runs the official RealWorld Hurl suite (pinned in the `spec` submodule) against a running server.
# Usage: [HOST=http://localhost:3000] scripts/run-api-tests.sh [spec/specs/api/hurl/<file>.hurl ...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUITE="$ROOT/spec/specs/api/run-api-tests-hurl.sh"

if [ ! -f "$SUITE" ]; then
  echo "Spec submodule missing. Run: git submodule update --init" >&2
  exit 1
fi

export HOST="${HOST:-http://localhost:3000}"
exec bash "$SUITE" "$@"
