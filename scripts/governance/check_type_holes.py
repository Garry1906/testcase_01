#!/usr/bin/env python3
"""
Iron Dome Ratchet — Python type holes (Any, type: ignore, cast)
Reads baseline from .memory-layer/baselines/type-safety.json
"""

import json
import re
import sys
from pathlib import Path

BASELINE_FILE = Path(".memory-layer/baselines/type-safety.json")
TYPE_HOLE_PATTERNS = [
    r": Any\b",
    r"-> Any\b",
    r"# type: ignore",
    r"cast\(Any",
]


def count_type_holes(directory: Path) -> int:
    count = 0
    for f in directory.rglob("*.py"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv"]):
            continue
        content = f.read_text()
        for pattern in TYPE_HOLE_PATTERNS:
            count += len(re.findall(pattern, content))
    return count


if not BASELINE_FILE.exists():
    print("✓ Type holes: no baseline yet")
    sys.exit(0)

baseline = json.loads(BASELINE_FILE.read_text())
app_dir = Path("app")
if not app_dir.exists():
    print("✓ Type holes: no app/ directory")
    sys.exit(0)

current = count_type_holes(app_dir)
limit = baseline.get("python_type_holes", 999)

if current > limit:
    print(f"✗ Type holes increased: {limit} → {current}", file=sys.stderr)
    sys.exit(1)

print(f"✓ Type holes: {current}/{limit} (baseline holds)")
