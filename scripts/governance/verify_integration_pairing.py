#!/usr/bin/env python3
"""Buddy System — new Python source files need integration tests"""

import subprocess
import sys
from pathlib import Path


def get_new_source_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=A"],
            capture_output=True,
            text=True,
        )
        return [
            Path(f)
            for f in result.stdout.strip().split("\n")
            if f.startswith("app/") and f.endswith(".py") and Path(f).exists()
        ]
    except Exception:
        return []


new_files = get_new_source_files()
if not new_files:
    print("✓ Integration pairing: no new source files added")
    sys.exit(0)

missing = []
for src in new_files:
    stem = src.stem
    integration_file = Path(f"tests/integration/test_{stem}_integration.py")
    if not integration_file.exists():
        missing.append(f"  {src} → missing {integration_file}")

if missing:
    print(
        "✗ Buddy System: new source files missing integration tests:", file=sys.stderr
    )
    for m in missing:
        print(m, file=sys.stderr)
    sys.exit(1)

print(f"✓ Integration pairing: all {len(new_files)} new file(s) have integration tests")
