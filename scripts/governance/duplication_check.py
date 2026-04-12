#!/usr/bin/env python3
"""DRY Enforcement — clone detection for Python source"""

import hashlib
import json
import sys
from pathlib import Path

BASELINE_FILE = Path(".memory-layer/baselines/clone-count.json")
MIN_CLONE_LINES = 6


def get_source_files(directory: Path) -> list[Path]:
    files = []
    for f in directory.rglob("*.py"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv", "test_", "_test"]):
            continue
        files.append(f)
    return files


def extract_chunks(content: str, n: int) -> list[str]:
    lines = [
        line.strip()
        for line in content.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    return ["\n".join(lines[i : i + n]) for i in range(len(lines) - n + 1)]


def count_clones(files: list[Path]) -> int:
    seen: dict[str, str] = {}
    clone_count = 0
    for filepath in files:
        content = filepath.read_text()
        for chunk in extract_chunks(content, MIN_CLONE_LINES):
            h = hashlib.md5(chunk.encode()).hexdigest()
            if h in seen:
                clone_count += 1
            else:
                seen[h] = str(filepath)
    return clone_count


if not BASELINE_FILE.exists():
    print("✓ Duplicate code: no baseline yet")
    sys.exit(0)

baseline = json.loads(BASELINE_FILE.read_text())
app_dir = Path("app")
if not app_dir.exists():
    print("✓ Duplicate code: no app/ directory")
    sys.exit(0)

files = get_source_files(app_dir)
current = count_clones(files)
limit = baseline.get("python_clone_count", 999)

if current > limit + 2:
    print(
        f"✗ Clone count increased: {limit} → {current} (allowance: +2)", file=sys.stderr
    )
    sys.exit(1)

print(f"✓ Duplicate code: {current} clones (baseline: {limit})")
