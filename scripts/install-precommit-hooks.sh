#!/usr/bin/env bash
# scripts/install-precommit-hooks.sh — Multi-stack pre-commit hook installer
# Installs a combined hook that runs BOTH Python and TypeScript configs.
set -euo pipefail

HOOK_PATH=".git/hooks/pre-commit"

echo "Installing combined pre-commit hook (Python + TypeScript)..."

if ! command -v pre-commit >/dev/null 2>&1; then
  echo "Error: pre-commit not found."
  echo "Install with: pip install pre-commit"
  exit 1
fi

# Install the hook environments (downloads tools, caches them)
pre-commit install-hooks -c .pre-commit-config.yaml 2>/dev/null || true
pre-commit install-hooks -c .pre-commit-config-ts.yaml 2>/dev/null || true

# Write the combined hook
cat > "$HOOK_PATH" << 'HOOK_EOF'
#!/usr/bin/env bash
# Combined pre-commit hook (Mault Step 6 — Python + TypeScript)
set -e

echo "=== Python governance hooks ==="
pre-commit run --config=.pre-commit-config.yaml "$@" || exit 1

echo "=== TypeScript governance hooks ==="
DATABASE_URL=postgresql://test:test@localhost:5432/testdb \
OPENAI_API_KEY=sk-test-key \
pre-commit run --config=.pre-commit-config-ts.yaml "$@" || exit 1

echo "=== All pre-commit hooks passed ==="
HOOK_EOF

chmod +x "$HOOK_PATH"
echo "Combined pre-commit hook installed at $HOOK_PATH"
echo "Run a test: git commit --allow-empty -m 'test: hook smoke test'"
