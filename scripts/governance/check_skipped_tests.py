#!/usr/bin/env python3
"""Test Discipline — max 5% skipped tests in Python test suite"""

import re
import sys
from pathlib import Path

MAX_PCT = 5
total_tests = 0
skipped_tests = 0

for filepath in Path("tests").rglob("test_*.py"):
    if any(p in str(filepath) for p in ["__pycache__"]):
        continue
    content = filepath.read_text()
    tests = len(re.findall(r"^\s*def test_", content, re.MULTILINE))
    skipped = len(re.findall(r"@pytest\.mark\.skip|@unittest\.skip|xfail", content))
    total_tests += tests
    skipped_tests += skipped

if total_tests == 0:
    print("✓ Skipped tests: no tests found")
    sys.exit(0)

pct = (skipped_tests / total_tests) * 100
print(f"  Tests: {total_tests}, Skipped: {skipped_tests} ({pct:.1f}%)")

if pct > MAX_PCT:
    print(f"✗ Too many skipped tests: {pct:.1f}% > {MAX_PCT}% limit", file=sys.stderr)
    sys.exit(1)

print(f"✓ Skipped tests: within {MAX_PCT}% limit")
