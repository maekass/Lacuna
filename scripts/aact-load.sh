#!/usr/bin/env bash
# Load AACT postgres.dmp into a dedicated `aact` database (separate from Lacuna app DB).
#
# Prereqs: docker compose up -d, npm run ml:ct:aact:link -- /path/to/snapshot
#
# Usage: npm run ml:ct:aact:load

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${ROOT}/ml/clinical_trials/data/aact/postgres.dmp"
PGUSER="${POSTGRES_USER:-lacuna}"
PGPASS="${POSTGRES_PASSWORD:-lacuna}"
COMPOSE="docker compose -f ${ROOT}/docker-compose.yml"

resolve_dump() {
  local path="$1"
  if [[ -L "$path" ]]; then
    path="$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$path")"
  fi
  if [[ ! -f "$path" ]]; then
    echo "Missing dump: $path"
    echo "Run: npm run ml:ct:aact:link -- /path/to/your/aact/download/folder"
    exit 1
  fi
  printf '%s' "$path"
}

DUMP="$(resolve_dump "$DUMP")"

echo "Creating database aact (if needed)…"
$COMPOSE exec -T postgres \
  psql -U "$PGUSER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='aact'" \
  | grep -q 1 \
  || $COMPOSE exec -T postgres psql -U "$PGUSER" -d postgres -c "CREATE DATABASE aact;"

echo "Restoring AACT dump (5–20 min for ~2.3 GB)…"
echo "Dump: $DUMP"

# Bind-mount avoids docker compose cp limits on large files outside the project tree (macOS).
docker run --rm \
  -v "${DUMP}:/dump/postgres.dmp:ro" \
  --network lacuna_default \
  -e PGPASSWORD="$PGPASS" \
  postgres:16-alpine \
  pg_restore \
    -h lacuna-postgres \
    -U "$PGUSER" \
    -d aact \
    --no-owner \
    --no-acl \
    /dump/postgres.dmp \
  2>&1 | tail -40

echo ""
echo "AACT loaded. Export training JSON:"
echo "  AACT_DATABASE_URL=postgresql://${PGUSER}:${PGPASS}@localhost:5432/aact npm run ml:ct:aact:export"
