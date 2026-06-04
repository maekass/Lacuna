#!/usr/bin/env sh
# Uptime smoke: liveness only. Do not point schedulers at /api/health/ready.
set -eu

BASE_URL="${LACUNA_MONITOR_URL:-https://lacuna-maekass.vercel.app}"
URL="${BASE_URL%/}/api/health"

body="$(curl -sf "$URL")" || {
  echo "FAIL: could not reach $URL" >&2
  exit 1
}

echo "$body" | jq -e '.ok == true and .probe == "live"' >/dev/null || {
  echo "FAIL: unexpected liveness payload from $URL" >&2
  echo "$body" >&2
  exit 1
}

echo "OK: $URL (probe=live)"
