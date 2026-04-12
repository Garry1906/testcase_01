#!/usr/bin/env bash
# Layer 0: TypeScript config validation
set -e
node -e "JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8'))" || { echo "FATAL: tsconfig.json invalid"; exit 1; }
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" || { echo "FATAL: package.json invalid"; exit 1; }
echo "✓ TypeScript config files valid"
