#!/usr/bin/env bash
# Symlink an AACT download folder into ml/clinical_trials/data/aact/
#
# Usage:
#   npm run ml:ct:aact:link -- /Users/you/Downloads/yxlj5iw6pf7dmp2ht1pcg368mx08
#   AACT_SNAPSHOT_DIR=/path/to/folder npm run ml:ct:aact:link

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/ml/clinical_trials/data/aact"
SRC="${1:-${AACT_SNAPSHOT_DIR:-}}"

if [[ -z "$SRC" ]]; then
  echo "Usage: npm run ml:ct:aact:link -- /path/to/aact/snapshot/folder"
  echo "   or: AACT_SNAPSHOT_DIR=/path npm run ml:ct:aact:link"
  exit 1
fi

if [[ ! -d "$SRC" ]]; then
  echo "Not a directory: $SRC"
  exit 1
fi

mkdir -p "$OUT"

link_one() {
  local name="$1"
  local src="${SRC}/${name}"
  local dest="${OUT}/${name}"
  if [[ ! -e "$src" ]]; then
    echo "  skip (missing): $name"
    return 0
  fi
  rm -f "$dest"
  ln -sf "$src" "$dest"
  echo "  linked: $name → $src"
}

echo "Linking AACT snapshot from $SRC"
link_one postgres.dmp
link_one data_dictionary.csv
link_one nlm_protocol_definitions.html
link_one nlm_results_definitions.html
link_one schema.png

if [[ -f "${OUT}/postgres.dmp" || -L "${OUT}/postgres.dmp" ]]; then
  echo ""
  echo "Next: docker compose up -d && npm run ml:ct:aact:load"
else
  echo "Warning: postgres.dmp not found in source folder"
  exit 1
fi
