#!/usr/bin/env python3
"""Mock Quality Gate — no forbidden mock patterns in Python tests"""

import re
import subprocess
import sys
from pathlib import Path


FORBIDDEN_PATTERNS = [
    (r"MagicMock\(\)", "Bare MagicMock() — use create_autospec() for type safety"),
    (r"patch\(['\"]__main__", "Patching __main__ — use dependency injection instead"),
]


def get_staged_test_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
            capture_output=True,
            text=True,
        )
        return [
            Path(f)
            for f in result.stdout.strip().split("\n")
            if f and ("test_" in f or "_test.py" in f) and Path(f).exists()
        ]
    except Exception:
        return []


files = get_staged_test_files()
if not files:
    print("✓ Mock conformance: no test files staged")
    sys.exit(0)

violations = []
for filepath in files:
    content = filepath.read_text()
    lines = content.splitlines()
    for i, line in enumerate(lines, 1):
        for pattern, msg in FORBIDDEN_PATTERNS:
            if re.search(pattern, line):
                violations.append(f"  {filepath}:{i} — {msg}")

if violations:
    print("✗ Adversarial mock patterns detected:", file=sys.stderr)
    for v in violations:
        print(v, file=sys.stderr)
    sys.exit(1)

print(f"✓ Mock conformance: {len(files)} test file(s) clean")
