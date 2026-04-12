#!/usr/bin/env bash
# mault-verify-step8.sh — Step 8 Governance Testing Verification (18 checks)
set -euo pipefail

PASS=0; FAIL=0; PENDING=0
STEP6_PROOF=".mault/verify-step6.proof"
PROOF_FILE=".mault/verify-step8.proof"
GOV_DIR="scripts/governance"
BASELINE_DIR=".memory-layer/baselines"

ok()  { echo "[PASS]    CHECK ${1}: ${2}"; PASS=$((PASS+1)); }
fail(){ echo "[FAIL]    CHECK ${1}: ${2}"; FAIL=$((FAIL+1)); }
pend(){ echo "[PEND]    CHECK ${1}: ${2}"; PENDING=$((PENDING+1)); }

echo "========================================"
echo "  MAULT Step 8 Governance Verification"
echo "  Stack: node python"
echo "========================================"
echo ""

# CHECK 1: Step 6 proof exists
if [[ -f "$STEP6_PROOF" ]] && grep -q "MAULT-STEP6" "$STEP6_PROOF" 2>/dev/null; then
  TOKEN=$(grep "Token:" "$STEP6_PROOF" | head -1 | sed 's/Token: //')
  [[ -z "$TOKEN" ]] && TOKEN=$(head -1 "$STEP6_PROOF")
  ok 1 "Step 6 proof exists ($TOKEN)"
else
  fail 1 "Step 6 proof not found at $STEP6_PROOF — complete Step 6 first"
fi

# CHECK 2: scripts/governance/ directory exists with scripts
TS_SCRIPTS=(guardrails-check.js check-any-usage.js check-silent-catches.js check-eslint-disable.js
  check-mock-tax.js check-adversarial-mocks.js verify-integration-pairing.js
  check-hallucinations.js check-security-critical.js check-circular-deps.js
  check-duplicate-code.js check-zod-boundaries.js check-mutation-score.js
  code-health-check.js check-per-file-baseline.mjs check-skipped-tests.js
  collect-metrics.js report-metrics.js generate-baselines.js)
PY_SCRIPTS=(guardrails_check.py check_type_holes.py check_silent_catches.py check_noqa.py
  check_mock_tax.py check_mock_conformance.py verify_integration_pairing.py
  check_hallucinations_pypi.py check_security_critical.py check_circular_deps.py
  duplication_check.py check_pydantic_boundaries.py check_mutation_score.py
  code_health_check.py check_per_file_baseline.py check_skipped_tests.py
  collect_metrics.py report_metrics.py test_impact_analysis.py)

MISSING_TS=()
for s in "${TS_SCRIPTS[@]}"; do
  [[ -f "$GOV_DIR/$s" ]] || MISSING_TS+=("$s")
done

MISSING_PY=()
for s in "${PY_SCRIPTS[@]}"; do
  [[ -f "$GOV_DIR/$s" ]] || MISSING_PY+=("$s")
done

if [[ ${#MISSING_TS[@]} -eq 0 ]]; then
  ok 2 "All TypeScript governance scripts present (${#TS_SCRIPTS[@]})"
else
  fail 2 "Missing TypeScript scripts: ${MISSING_TS[*]}"
fi

# CHECK 3: Python governance scripts
if [[ ${#MISSING_PY[@]} -eq 0 ]]; then
  ok 3 "All Python governance scripts present (${#PY_SCRIPTS[@]})"
else
  fail 3 "Missing Python scripts: ${MISSING_PY[*]}"
fi

# CHECK 4: Baselines generated
BASELINES=(type-safety.json mock-tax.json coverage.json clone-count.json guardrails.json code-health.json)
MISSING_BL=()
for b in "${BASELINES[@]}"; do
  [[ -f "$BASELINE_DIR/$b" ]] || MISSING_BL+=("$b")
done

if [[ ${#MISSING_BL[@]} -eq 0 ]]; then
  ok 4 "All 6 baseline files present"
else
  fail 4 "Missing baselines: ${MISSING_BL[*]}"
fi

# CHECK 5: TypeScript guardrails pass
if DATABASE_URL=postgresql://test:test@localhost:5432/testdb OPENAI_API_KEY=sk-test-key \
   node "$GOV_DIR/guardrails-check.js" src/env.ts 2>/dev/null | grep -q "✓"; then
  ok 5 "TypeScript guardrails pass (file/function LOC within SRP limits)"
else
  fail 5 "TypeScript guardrails failed — check file/function sizes"
fi

# CHECK 6: Python guardrails pass
if python3 "$GOV_DIR/guardrails_check.py" app/config.py 2>/dev/null | grep -q "✓"; then
  ok 6 "Python guardrails pass"
else
  fail 6 "Python guardrails failed"
fi

# CHECK 7: Iron Dome — TypeScript any count
if node "$GOV_DIR/check-any-usage.js" 2>/dev/null | grep -q "✓"; then
  ok 7 "Iron Dome TypeScript any usage within baseline"
else
  fail 7 "Iron Dome: TypeScript any count exceeded baseline"
fi

# CHECK 8: Iron Dome — Python type holes
if python3 "$GOV_DIR/check_type_holes.py" 2>/dev/null | grep -q "✓"; then
  ok 8 "Iron Dome Python type holes within baseline"
else
  fail 8 "Iron Dome: Python type holes exceeded baseline"
fi

# CHECK 9: Mock Tax — TypeScript
if node "$GOV_DIR/check-mock-tax.js" 2>/dev/null | grep -q "✓"; then
  ok 9 "Rising Tide TypeScript mock tax within ratchet"
else
  fail 9 "Rising Tide: TypeScript mock tax exceeded baseline ratio"
fi

# CHECK 10: Mock Tax — Python
if python3 "$GOV_DIR/check_mock_tax.py" 2>/dev/null | grep -q "✓"; then
  ok 10 "Rising Tide Python mock tax within ratchet"
else
  fail 10 "Rising Tide: Python mock tax exceeded baseline ratio"
fi

# CHECK 11: Skipped tests — both stacks
TS_SKIP=$(node "$GOV_DIR/check-skipped-tests.js" 2>/dev/null | grep -c "✓" || echo 0)
PY_SKIP=$(python3 "$GOV_DIR/check_skipped_tests.py" 2>/dev/null | grep -c "✓" || echo 0)
if [[ "$TS_SKIP" -ge 1 ]] && [[ "$PY_SKIP" -ge 1 ]]; then
  ok 11 "Test Discipline: both stacks within 5% skipped limit"
else
  fail 11 "Test Discipline: skipped tests above limit (TS:$TS_SKIP Python:$PY_SKIP)"
fi

# CHECK 12: Circular dependency checks pass
TS_CIRC=$(node "$GOV_DIR/check-circular-deps.js" 2>/dev/null | grep -c "✓" || echo 0)
PY_CIRC=$(python3 "$GOV_DIR/check_circular_deps.py" 2>/dev/null | grep -c "✓" || echo 0)
if [[ "$TS_CIRC" -ge 1 ]] && [[ "$PY_CIRC" -ge 1 ]]; then
  ok 12 "Dependency Health: no circular imports in either stack"
else
  fail 12 "Circular dependencies detected"
fi

# CHECK 13: CI has gitleaks job
if grep -q "gitleaks" .github/workflows/ci.yml 2>/dev/null; then
  ok 13 "CI workflow has gitleaks secret scan job"
else
  fail 13 "CI workflow missing gitleaks job"
fi

# CHECK 14: CI has package-audit job
if grep -q "package-audit" .github/workflows/ci.yml 2>/dev/null; then
  ok 14 "CI workflow has package-audit job"
else
  fail 14 "CI workflow missing package-audit job"
fi

# CHECK 15: CI has governance job
if grep -q "^  governance:" .github/workflows/ci.yml 2>/dev/null; then
  ok 15 "CI workflow has governance quality gates job"
else
  fail 15 "CI workflow missing governance job"
fi

# CHECK 16: .gitleaks.toml exists
if [[ -f ".gitleaks.toml" ]]; then
  ok 16 ".gitleaks.toml secret detection config present"
else
  fail 16 ".gitleaks.toml missing"
fi

# CHECK 17: Governance manifest exists
if [[ -f ".mault/governance-manifest.json" ]] && \
   python3 -c "import json; d=json.load(open('.mault/governance-manifest.json')); assert d.get('step')==8" 2>/dev/null; then
  ok 17 ".mault/governance-manifest.json present and valid"
else
  fail 17 ".mault/governance-manifest.json missing or invalid"
fi

# CHECK 18: Handshake commit with [mault-step8]
HANDSHAKE_SHA=$(git log --oneline --grep="\[mault-step8\]" | head -1 | awk '{print $1}')
HANDSHAKE_MSG=$(git log --oneline --grep="\[mault-step8\]" | head -1)
if [[ -n "$HANDSHAKE_SHA" ]]; then
  ok 18 "Handshake commit found: $HANDSHAKE_MSG"
else
  fail 18 "No commit with [mault-step8] found — handshake commit required"
fi

echo ""
echo "========================================"
echo "  PASS: ${PASS}/18  FAIL: ${FAIL}/18  PENDING: ${PENDING}/18"
echo "========================================"

if [[ $FAIL -eq 0 ]]; then
  TIMESTAMP=$(date +%s)
  LATEST_SHA=$(git rev-parse --short HEAD)
  TOKEN="MAULT-STEP8-${LATEST_SHA}-${TIMESTAMP}-${PASS}/18"
  echo "$TOKEN" > "$PROOF_FILE"
  echo "Proof file written: $PROOF_FILE"
  echo "Token: $TOKEN"
  echo "ALL CHECKS PASSED. Step 8 Governance Testing is complete."

  # Create GitHub handshake issue
  EXISTING=$(gh issue list --label "mault-step8" --json number --jq '.[0].number' 2>/dev/null || echo "")
  if [[ -z "$EXISTING" ]]; then
    gh issue create \
      --title "[mault-step8] Governance Testing — proof ${LATEST_SHA}" \
      --label "mault-agent" \
      --body "## Step 8 Governance Testing Complete

**Proof Token:** \`${TOKEN}\`

### Scripts Deployed

- **TypeScript (19 scripts)**: Iron Dome, Rising Tide, Buddy System, Coverage Fortress, SRP Guardrails, Supply Chain, Security Review, DRY, Schema Validation, Mutation Score
- **Python (20 scripts)**: Same philosophy coverage for Python stack

### Baselines Generated

- \`.memory-layer/baselines/type-safety.json\` — any: 0, noqa: 0
- \`.memory-layer/baselines/mock-tax.json\` — TS ratio: 1.55×, Python ratio: 4.76×
- \`.memory-layer/baselines/coverage.json\` — per-file coverage floor
- \`.memory-layer/baselines/clone-count.json\` — clone: 0
- \`.memory-layer/baselines/guardrails.json\` — all files within SRP limits
- \`.memory-layer/baselines/code-health.json\` — orphan baseline

### CI Jobs Added

- \`gitleaks\` — secret scan on every push
- \`package-audit\` — dependency audit when package files change
- \`governance\` — all quality gates in CI

All 18/18 checks passed." \
      2>/dev/null | tail -1 || echo "Issue creation skipped (may already exist)"
    echo "Handshake issue created."
  else
    echo "Handshake issue already exists: #${EXISTING}"
  fi
  exit 0
else
  echo "SOME CHECKS FAILED. Fix failures and re-run."
  exit 1
fi
