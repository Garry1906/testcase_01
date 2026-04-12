#!/usr/bin/env bash
set -uo pipefail

# ╔══════════════════════════════════════════════════════════════╗
# ║  MAULT RALPH LOOP — Step 6 Pre-commit Framework Verification ║
# ║  Physics, not policy. This script checks REAL STATE.         ║
# ║  Exit 0 = all pass. Exit 1 = work remains.                  ║
# ╚══════════════════════════════════════════════════════════════╝

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()
TOTAL_CHECKS=12

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step6.proof"

record_result() { CHECK_RESULTS+=("CHECK $1: $2 - $3"); }
print_pass()    { echo "[PASS]    CHECK $1: $2"; PASS_COUNT=$((PASS_COUNT + 1)); record_result "$1" "PASS" "$2"; }
print_fail()    { echo "[FAIL]    CHECK $1: $2"; FAIL_COUNT=$((FAIL_COUNT + 1)); record_result "$1" "FAIL" "$2"; }
print_pending() { echo "[PENDING] CHECK $1: $2"; PENDING_COUNT=$((PENDING_COUNT + 1)); record_result "$1" "PENDING" "$2"; }

# --- Staleness check ---
if [ -f "$PROOF_FILE" ]; then
  PROOF_SHA=$(grep '^GitSHA:' "$PROOF_FILE" | awk '{print $2}')
  CURRENT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  if [ "$PROOF_SHA" != "$CURRENT_SHA" ]; then
    echo "WARNING: Proof file is STALE (proof: $PROOF_SHA, HEAD: $CURRENT_SHA). Deleting."
    rm -f "$PROOF_FILE"
  fi
fi

# --- Default branch detection ---
detect_default_branch() {
  local branch
  branch=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null) || true
  if [ -n "$branch" ]; then echo "$branch"; return; fi
  if git show-ref --verify --quiet refs/heads/master 2>/dev/null; then echo "master"
  else echo "main"; fi
}
DEFAULT_BRANCH=$(detect_default_branch)

# --- Stack detection ---
detect_stack() {
  local detected=""
  [ -f "package.json" ] && detected="${detected}node "
  { [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; } && detected="${detected}python "
  echo "$detected" | xargs
}
STACK=$(detect_stack)

echo "========================================"
echo "  MAULT Step 6 Pre-commit Verification"
echo "  Stack: ${STACK:-none} | Branch: $DEFAULT_BRANCH"
echo "========================================"
echo ""

# --- Proof file ---
write_proof_file() {
  local sha epoch iso token
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  epoch=$(date +%s)
  iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  token="MAULT-STEP6-${sha}-${epoch}-${TOTAL_CHECKS}/${TOTAL_CHECKS}"

  mkdir -p "$PROOF_DIR"
  {
    echo "MAULT-STEP6-PROOF"
    echo "=================="
    echo "Timestamp: $epoch"
    echo "DateTime: $iso"
    echo "GitSHA: $sha"
    echo "Checks: ${TOTAL_CHECKS}/${TOTAL_CHECKS} PASS"
    for r in "${CHECK_RESULTS[@]}"; do echo "  $r"; done
    echo "=================="
    echo "Token: $token"
  } > "$PROOF_FILE"

  echo ""
  echo "Proof file written: $PROOF_FILE"
  echo "Token: $token"
}

# --- CHECK 1: Step 5 prerequisite ---
check_1() {
  if [ ! -f ".mault/verify-step5.proof" ]; then
    print_fail 1 "Step 5 not complete. Run mault-verify-step5.sh first."
    return
  fi
  local token
  token=$(grep '^Token:' .mault/verify-step5.proof | awk '{print $2}') || true
  print_pass 1 "Step 5 proof exists (${token:-unknown})"
}

# --- CHECK 2: pre-commit installed ---
check_2() {
  if command -v pre-commit >/dev/null 2>&1; then
    local ver
    ver=$(pre-commit --version 2>/dev/null | head -1)
    print_pass 2 "pre-commit installed: ${ver}"
  else
    print_fail 2 "pre-commit not found. Install with: pip install pre-commit"
  fi
}

# --- CHECK 3: Config files exist ---
check_3() {
  local found_python=false found_ts=false missing=""

  [ -f ".pre-commit-config.yaml" ] && found_python=true
  [ -f ".pre-commit-config-ts.yaml" ] && found_ts=true

  if echo "$STACK" | grep -q "python" && ! $found_python; then
    missing="${missing}.pre-commit-config.yaml "
  fi
  if echo "$STACK" | grep -q "node" && ! $found_ts; then
    missing="${missing}.pre-commit-config-ts.yaml "
  fi

  if [ -z "$missing" ]; then
    local configs=""
    $found_python && configs="${configs}.pre-commit-config.yaml "
    $found_ts && configs="${configs}.pre-commit-config-ts.yaml "
    print_pass 3 "Config files present: ${configs}"
  else
    print_fail 3 "Missing config files: ${missing}"
  fi
}

# --- CHECK 4: Git hook installed ---
check_4() {
  if [ -f ".git/hooks/pre-commit" ] && [ -x ".git/hooks/pre-commit" ]; then
    print_pass 4 "Git pre-commit hook installed and executable"
  else
    print_fail 4 "Git pre-commit hook missing or not executable. Run: pre-commit install"
  fi
}

# --- CHECK 5: Python hooks pass ---
check_5() {
  if ! echo "$STACK" | grep -q "python"; then
    print_pass 5 "No Python stack detected — skipped"
    return
  fi
  if [ ! -f ".pre-commit-config.yaml" ]; then
    print_fail 5 "Python config missing (.pre-commit-config.yaml)"
    return
  fi
  if ! command -v pre-commit >/dev/null 2>&1; then
    print_pending 5 "pre-commit not installed — cannot verify hooks"
    return
  fi

  local output exit_code
  output=$(pre-commit run --all-files -c .pre-commit-config.yaml 2>&1)
  exit_code=$?

  if [ "$exit_code" -eq 0 ]; then
    print_pass 5 "Python pre-commit hooks pass (all files)"
  else
    # Auto-fixed files exit 1 but leave files modified — check if re-running passes
    local output2 exit_code2
    output2=$(pre-commit run --all-files -c .pre-commit-config.yaml 2>&1)
    exit_code2=$?
    if [ "$exit_code2" -eq 0 ]; then
      print_pass 5 "Python hooks pass (after auto-fix)"
    else
      echo "$output2" | tail -20
      print_fail 5 "Python hooks FAIL. Exit code: ${exit_code2}. Fix and re-run."
    fi
  fi
}

# --- CHECK 6: TypeScript hooks pass ---
check_6() {
  if ! echo "$STACK" | grep -q "node"; then
    print_pass 6 "No Node stack detected — skipped"
    return
  fi
  if [ ! -f ".pre-commit-config-ts.yaml" ]; then
    print_fail 6 "TypeScript config missing (.pre-commit-config-ts.yaml)"
    return
  fi
  if ! command -v pre-commit >/dev/null 2>&1; then
    print_pending 6 "pre-commit not installed — cannot verify hooks"
    return
  fi

  local output exit_code
  output=$(DATABASE_URL=postgresql://test:test@localhost:5432/testdb \
           OPENAI_API_KEY=sk-test-key \
           pre-commit run --all-files -c .pre-commit-config-ts.yaml 2>&1)
  exit_code=$?

  if [ "$exit_code" -eq 0 ]; then
    print_pass 6 "TypeScript pre-commit hooks pass (all files)"
  else
    echo "$output" | tail -20
    print_fail 6 "TypeScript hooks FAIL. Exit code: ${exit_code}. Fix and re-run."
  fi
}

# --- CHECK 7: CI has validate-pr-title job ---
check_7() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true

  if [ -z "$ci_file" ]; then
    print_fail 7 "No CI workflow found."
    return
  fi

  if grep -qE 'validate.?pr.?title|semantic.pull.request|action-semantic-pull-request' "$ci_file" 2>/dev/null; then
    print_pass 7 "CI workflow has validate-pr-title job"
  else
    print_fail 7 "CI workflow missing validate-pr-title job. Add it in Phase 5."
  fi
}

# --- CHECK 8: CI has validate-branch-name job ---
check_8() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true

  if [ -z "$ci_file" ]; then
    print_fail 8 "No CI workflow found."
    return
  fi

  if grep -qE 'validate.?branch.?name|branch.*name.*valid' "$ci_file" 2>/dev/null; then
    print_pass 8 "CI workflow has validate-branch-name job"
  else
    print_fail 8 "CI workflow missing validate-branch-name job. Add it in Phase 6."
  fi
}

# --- CHECK 9: Branch protection includes validate jobs ---
check_9() {
  local owner repo
  owner=$(gh repo view --json owner -q '.owner.login' 2>/dev/null) || true
  repo=$(gh repo view --json name -q '.name' 2>/dev/null) || true

  if [ -z "$owner" ] || [ -z "$repo" ]; then
    print_pending 9 "Cannot check branch protection — gh not available"
    return
  fi

  local contexts
  contexts=$(gh api "repos/${owner}/${repo}/branches/${DEFAULT_BRANCH}/protection/required_status_checks" \
    -q '.contexts[]' 2>/dev/null) || true

  local has_pr_title has_branch_name
  has_pr_title=$(echo "$contexts" | grep -qi "pr.title\|semantic\|pull.request" && echo "true" || echo "false")
  has_branch_name=$(echo "$contexts" | grep -qi "branch.name\|branch.valid" && echo "true" || echo "false")

  if [ "$has_pr_title" = "true" ] || [ "$has_branch_name" = "true" ]; then
    print_pass 9 "Branch protection includes validate-pr-title/validate-branch-name"
  else
    print_fail 9 "Branch protection missing validate checks. Update in Phase 7."
  fi
}

# --- CHECK 10: Handshake commit exists ---
check_10() {
  local commit
  commit=$(git log --oneline --all 2>/dev/null | grep '\[mault-step6\]' | head -1) || true

  if [ -n "$commit" ]; then
    print_pass 10 "Handshake commit found: ${commit:0:72}"
  else
    print_fail 10 "No commit with [mault-step6] in message. Complete Phase 8."
  fi
}

# --- CHECK 11: pre-commit manifest exists ---
check_11() {
  if [ -f ".mault/pre-commit-manifest.json" ]; then
    local stacks
    stacks=$(python3 -c "import json; d=json.load(open('.mault/pre-commit-manifest.json')); print(d.get('stacks','?'))" 2>/dev/null || echo "?")
    print_pass 11 "pre-commit manifest exists (stacks: ${stacks})"
  else
    print_fail 11 "Missing .mault/pre-commit-manifest.json. Complete Phase 8."
  fi
}

# --- CHECK 12: Handshake issue exists ---
check_12() {
  if ! command -v gh >/dev/null 2>&1; then
    print_pending 12 "gh CLI not available"
    return
  fi

  local issue_url
  issue_url=$(gh issue list --search "[MAULT] Production Readiness: Step 6" --json url -q '.[0].url' 2>/dev/null) || true
  if [ -z "$issue_url" ]; then
    issue_url=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 6" --json url -q '.[0].url' 2>/dev/null) || true
  fi

  if [ -n "$issue_url" ]; then
    print_pass 12 "Handshake issue: ${issue_url}"
  else
    print_pending 12 "No handshake issue found. Create it in Phase 9."
  fi
}

# --- Run all checks ---
check_1; check_2; check_3; check_4; check_5; check_6
check_7; check_8; check_9; check_10; check_11; check_12

# --- Summary ---
echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/${TOTAL_CHECKS}  FAIL: ${FAIL_COUNT}/${TOTAL_CHECKS}  PENDING: ${PENDING_COUNT}/${TOTAL_CHECKS}"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
  write_proof_file
  echo "ALL CHECKS PASSED. Step 6 Pre-commit Framework is complete."
  exit 0
elif [ "$FAIL_COUNT" -gt 0 ]; then
  rm -f "$PROOF_FILE"
  echo "${FAIL_COUNT} check(s) FAILED. Fix and re-run: ./mault-verify-step6.sh"
  exit 1
else
  rm -f "$PROOF_FILE"
  echo "${PENDING_COUNT} check(s) PENDING. Complete work and re-run: ./mault-verify-step6.sh"
  exit 1
fi
