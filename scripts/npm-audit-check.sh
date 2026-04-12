#!/usr/bin/env bash
# Layer 6: npm audit security check (non-blocking)
npm audit --audit-level=high --omit=dev 2>/dev/null \
  && echo "✓ No high/critical vulnerabilities" \
  || echo "WARNING: npm audit found issues — review manually"
exit 0
