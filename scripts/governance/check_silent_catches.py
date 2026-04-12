#!/usr/bin/env python3
"""
Iron Dome Ratchet — bare except: pass or except Exception: pass blocks
"""

import ast
import json
import sys
from pathlib import Path

BASELINE_FILE = Path(".memory-layer/baselines/type-safety.json")


def count_silent_catches(directory: Path) -> int:
    count = 0
    for f in directory.rglob("*.py"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv"]):
            continue
        try:
            tree = ast.parse(f.read_text())
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.ExceptHandler):
                body = node.body
                if all(
                    isinstance(s, ast.Pass)
                    or (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))
                    for s in body
                ):
                    count += 1
    return count


if not BASELINE_FILE.exists():
    print("✓ Silent catches: no baseline yet")
    sys.exit(0)

baseline = json.loads(BASELINE_FILE.read_text())
app_dir = Path("app")
if not app_dir.exists():
    print("✓ Silent catches: no app/ directory")
    sys.exit(0)

current = count_silent_catches(app_dir)
limit = baseline.get("python_silent_catches", 999)

if current > limit:
    print(f"✗ Silent catches increased: {limit} → {current}", file=sys.stderr)
    sys.exit(1)

print(f"✓ Silent catches: {current}/{limit} (baseline holds)")
