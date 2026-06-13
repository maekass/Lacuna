#!/usr/bin/env bash
# Require CI status check on main. Needs: gh auth with admin on the repo.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-maekass/Lacuna}"
BRANCH="${1:-main}"

echo "Configuring branch protection for ${REPO}@${BRANCH}..."

gh api \
  -X PUT \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  -f required_status_checks='{"strict":true,"contexts":["ci"]}' \
  -F enforce_admins=false \
  -F required_pull_request_reviews='{"required_approving_review_count":0,"dismiss_stale_reviews":false}' \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false

echo "Done. Merges to ${BRANCH} now require the CI check to pass."
