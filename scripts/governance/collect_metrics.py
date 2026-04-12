#!/usr/bin/env python3
"""Governance Tax Tracking — collect metrics for Python + TypeScript codebase"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path


def count_pattern(directory: Path, suffix: str, pattern: str) -> int:
    count = 0
    for f in directory.rglob(f"*{suffix}"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv", "node_modules"]):
            continue
        count += len(re.findall(pattern, f.read_text()))
    return count


def count_loc(directory: Path, suffix: str) -> int:
    count = 0
    for f in directory.rglob(f"*{suffix}"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv", "node_modules"]):
            continue
        count += len(f.read_text().splitlines())
    return count


metrics = {
    "collected_at": datetime.now(timezone.utc).isoformat(),
    "python_type_holes": count_pattern(Path("app"), ".py", r": Any\b|# type: ignore"),
    "python_noqa": count_pattern(Path("app"), ".py", r"# noqa"),
    "python_silent_catches": 0,  # counted via AST in dedicated script
    "python_clone_count": 0,  # counted via dedicated script
    "ts_any_count": count_pattern(Path("src"), ".ts", r": any\b|as any\b|<any>"),
    "ts_eslint_disable": count_pattern(Path("src"), ".ts", r"eslint-disable"),
    "source_loc_py": count_loc(Path("app"), ".py"),
    "test_loc_py": count_loc(Path("tests"), ".py"),
    "source_loc_ts": count_loc(Path("src"), ".ts"),
    "test_loc_ts": count_loc(Path("tests"), ".ts")
    + count_loc(Path("src/__tests__"), ".ts"),
}

Path(".memory-layer/metrics").mkdir(parents=True, exist_ok=True)
Path(".memory-layer/metrics/latest.json").write_text(json.dumps(metrics, indent=2))

print("Governance metrics collected:")
for k, v in metrics.items():
    if k != "collected_at":
        print(f"  {k}: {v}")
