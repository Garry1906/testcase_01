#!/usr/bin/env python3
"""Security Review Gate — @security-critical blocks require human review"""

import subprocess
import sys
from pathlib import Path


def get_staged_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
            capture_output=True,
            text=True,
        )
        return [
            Path(f) for f in result.stdout.strip().split("\n") if f and Path(f).exists()
        ]
    except Exception:
        return []


files = get_staged_files()
violations = []

SOURCE_EXTS = {".py", ".ts", ".js", ".tsx", ".jsx"}
for filepath in files:
    if filepath.suffix not in SOURCE_EXTS:
        continue
    content = filepath.read_text()
    if "@security-critical" in content and "security-review-approved:" not in content:
        violations.append(
            f"  {filepath}: has @security-critical but no security-review-approved comment"
        )

if violations:
    print("✗ Security Review Gate:", file=sys.stderr)
    for v in violations:
        print(v, file=sys.stderr)
    print("  Add: # security-review-approved: <reviewer> <date>", file=sys.stderr)
    sys.exit(1)

print("✓ Security review: no unapproved security-critical blocks")
