#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  mault-solo-merge.sh — Solo Developer PR Merge Helper       ║
# ║  Temporarily disables review requirement, merges, restores. ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

PR_NUMBER="${1:-}"
if [ -z "$PR_NUMBER" ]; then
  echo "Usage: ./mault-solo-merge.sh <PR_NUMBER>"
  exit 1
fi

OWNER=$(gh repo view --json owner -q '.owner.login')
REPO=$(gh repo view --json name -q '.name')
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name')

echo "Merging PR #${PR_NUMBER} as solo developer..."
echo ""

# Step 1: Get current protection settings
echo "1. Reading current branch protection..."
CURRENT_CONTEXTS=$(gh api "repos/${OWNER}/${REPO}/branches/${DEFAULT_BRANCH}/protection/required_status_checks" \
  -q '.contexts | @json' 2>/dev/null || echo '"[]"')

# Step 2: Disable PR review requirement
echo "2. Temporarily disabling review requirement..."
echo "{
  \"required_status_checks\": {\"strict\": true, \"contexts\": ${CURRENT_CONTEXTS}},
  \"enforce_admins\": true,
  \"required_pull_request_reviews\": null,
  \"restrictions\": null
}" | gh api "repos/${OWNER}/${REPO}/branches/${DEFAULT_BRANCH}/protection" \
  --method PUT --input - --silent

# Step 3: Merge the PR
echo "3. Merging PR #${PR_NUMBER} (squash)..."
gh pr merge "$PR_NUMBER" --squash --delete-branch

# Step 4: Restore review requirement
echo "4. Restoring review requirement (1 approval required)..."
echo "{
  \"required_status_checks\": {\"strict\": true, \"contexts\": ${CURRENT_CONTEXTS}},
  \"enforce_admins\": true,
  \"required_pull_request_reviews\": {
    \"required_approving_review_count\": 1,
    \"dismiss_stale_reviews\": true
  },
  \"restrictions\": null
}" | gh api "repos/${OWNER}/${REPO}/branches/${DEFAULT_BRANCH}/protection" \
  --method PUT --input - --silent

echo ""
echo "Done. PR #${PR_NUMBER} merged and branch protection restored."
