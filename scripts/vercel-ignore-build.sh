#!/usr/bin/env bash
# Vercel Ignored Build Step — exit 0 to skip, exit 1 to build.
# Skips deploys when the diff from the previous commit touches only docs/markdown.
set -euo pipefail

if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  # First commit or shallow clone — always build.
  exit 1
fi

if git diff HEAD^ HEAD --quiet -- . ':!docs' ':!*.md' ':!README.md'; then
  echo "Only docs/markdown changed — skipping Vercel build."
  exit 0
fi

echo "Application files changed — running Vercel build."
exit 1
