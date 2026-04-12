#!/usr/bin/env python3
"""Escape Hatch Gate — no new # noqa suppressions"""

import json
import re
import sys
from pathlib import Path

BASELINE_FILE = Path(".memory-layer/baselines/type-safety.json")


def count_noqa(directory: Path) -> int:
    count = 0
    for f in directory.rglob("*.py"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv"]):
            continue
        count += len(re.findall(r"# noqa", f.read_text()))
    return count


if not BASELINE_FILE.exists():
    print("✓ noqa: no baseline yet")
    sys.exit(0)

baseline = json.loads(BASELINE_FILE.read_text())
app_dir = Path("app")
if not app_dir.exists():
    print("✓ noqa: no app/ directory")
    sys.exit(0)

current = count_noqa(app_dir)
limit = baseline.get("python_noqa", 999)

if current > limit:
    print(f"✗ noqa suppressions increased: {limit} → {current}", file=sys.stderr)
    sys.exit(1)

print(f"✓ noqa: {current}/{limit} (baseline holds)")
