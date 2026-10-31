#!/usr/bin/env bash
# Runs the official RealWorld Bruno collection (generated from the Hurl suite) against a running server.
# Same as spec/specs/api/run-api-tests-bruno.sh, but through npx so it does not need bun.
# Usage: [HOST=http://localhost:3000] scripts/run-api-tests-bruno.sh [folder ...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COLLECTION="$ROOT/spec/specs/api/bruno"
BRUNO_CLI="@usebruno/cli@4.3.0"

if [ ! -d "$COLLECTION" ]; then
  echo "Spec submodule missing. Run: git submodule update --init" >&2
  exit 1
fi

HOST="${HOST:-http://localhost:3000}"

FOLDERS=("$@")
if [ ${#FOLDERS[@]} -eq 0 ]; then
  for entry in "$COLLECTION"/*/; do
    name="$(basename "$entry")"
    [ "$name" = "environments" ] && continue
    FOLDERS+=("$name")
  done
fi

cd "$COLLECTION"
for folder in "${FOLDERS[@]}"; do
  echo "--- bru run $folder ---"
  npx -y "$BRUNO_CLI" run "$folder" --env local --env-var "host=$HOST" --sandbox safe
done
