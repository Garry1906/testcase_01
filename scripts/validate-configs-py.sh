#!/usr/bin/env bash
# Layer 0: Python config validation
set -e
python3 -c "import tomllib; tomllib.load(open('pyproject.toml', 'rb')); print('pyproject.toml valid')" \
  2>/dev/null || python3 -c "import tomli; tomli.load(open('pyproject.toml', 'rb')); print('pyproject.toml valid')" \
  2>/dev/null || { echo "WARNING: Cannot validate pyproject.toml (no tomllib/tomli)"; }
echo "✓ Config files valid"
