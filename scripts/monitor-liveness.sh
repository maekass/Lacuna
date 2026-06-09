#!/usr/bin/env sh
# Uptime smoke: liveness only. Do not point schedulers at /api/health/ready.
set -eu

BASE_URL="${LACUNA_MONITOR_URL:-https://lacuna-maekass.vercel.app}"
URL="${BASE_URL%/}/api/health"

CURL_ARGS="-sS"
if [ -n "${VERCEL_PROTECTION_BYPASS:-}" ]; then
  CURL_ARGS="$CURL_ARGS -H x-vercel-protection-bypass:${VERCEL_PROTECTION_BYPASS}"
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

http_code="$(curl $CURL_ARGS -o "$tmp" -w '%{http_code}' "$URL" || true)"

if [ "$http_code" = "401" ]; then
  echo "FAIL: $URL returned HTTP 401 (Vercel Deployment Protection)" >&2
  echo "The URL is correct; external monitors are blocked until you either:" >&2
  echo "  • Turn off Deployment Protection for production, or" >&2
  echo "  • Add a Protection Bypass for Automation secret (Vercel → Settings → Deployment Protection)" >&2
  echo "    and run: VERCEL_PROTECTION_BYPASS='your-secret' npm run monitor:liveness" >&2
  echo "  • Test locally: LACUNA_MONITOR_URL=http://localhost:3000 npm run monitor:liveness" >&2
  echo "See docs/MONITORING.md" >&2
  exit 1
fi

if [ "$http_code" != "200" ]; then
  echo "FAIL: $URL returned HTTP $http_code (expected 200)" >&2
  if [ -s "$tmp" ]; then
    head -c 500 "$tmp" >&2
    echo >&2
  fi
  exit 1
fi

body="$(cat "$tmp")"

echo "$body" | jq -e '.ok == true and .probe == "live"' >/dev/null || {
  echo "FAIL: unexpected liveness payload from $URL (HTTP 200)" >&2
  echo "$body" >&2
  exit 1
}

echo "OK: $URL (probe=live)"
