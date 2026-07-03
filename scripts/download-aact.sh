#!/usr/bin/env bash
# Tier 2 — AACT (ClinicalTrials.gov PostgreSQL snapshot) download helper.
# Requires free registration at https://aact.ctti-clinicaltrials.org/
#
# Usage:
#   AACT_USERNAME=you AACT_PASSWORD=secret npm run download:aact
#   AACT_USERNAME=you AACT_PASSWORD=secret npm run download:aact -- --pipe-only

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/ml/clinical_trials/data/aact"
mkdir -p "$OUT_DIR"

PIPE_ONLY=false
if [[ "${1:-}" == "--pipe-only" ]]; then
  PIPE_ONLY=true
fi

if [[ -z "${AACT_USERNAME:-}" || -z "${AACT_PASSWORD:-}" ]]; then
  echo "Set AACT_USERNAME and AACT_PASSWORD (register at https://aact.ctti-clinicaltrials.org/)"
  echo "For schema/docs only: npm run download:aact -- --pipe-only"
  if [[ "$PIPE_ONLY" == true ]]; then
    echo "Pipe-only mode: see ${OUT_DIR}/README.md"
    exit 0
  fi
  exit 1
fi

STAMP=$(date -u +%Y%m%d)
DUMP="${OUT_DIR}/aact_${STAMP}.dump"

echo "Downloading AACT pipe-delimited export (this may take several minutes)…"
echo "Output: ${DUMP}.gz"

# CTTI provides pg_dump snapshots; URL pattern may change — verify on aact.ctti-clinicaltrials.org
AACT_URL="https://aact.ctti-clinicaltrials.org/static/static_db_copies/daily/${STAMP}_clinical_trials.zip"

if curl -sfL -u "${AACT_USERNAME}:${AACT_PASSWORD}" -o "${OUT_DIR}/aact_${STAMP}.zip" "$AACT_URL"; then
  unzip -o "${OUT_DIR}/aact_${STAMP}.zip" -d "$OUT_DIR"
  echo "Unzipped to ${OUT_DIR}"
  echo "Load with: docker compose exec postgres pg_restore -d lacuna ${OUT_DIR}/postgres.dmp"
else
  echo "Direct download failed — use the AACT web UI to download the daily snapshot."
  echo "Place files under ${OUT_DIR}/ (gitignored) and run: npm run ml:ct:train"
  exit 1
fi
