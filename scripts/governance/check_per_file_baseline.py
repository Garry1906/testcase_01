#!/usr/bin/env python3
"""Coverage Fortress — per-file coverage ratchet for Python"""

import json
import subprocess
import sys
from pathlib import Path

BASELINE_FILE = Path(".memory-layer/baselines/coverage.json")
FLOOR = 80.0
TOLERANCE = 0.2


def get_current_coverage() -> dict[str, float]:
    coverage_json = Path(".coverage.json")
    if not coverage_json.exists():
        result = subprocess.run(
            [
                "python3",
                "-m",
                "pytest",
                "tests/",
                "--cov=app",
                "--cov-report=json",
                "-q",
                "--tb=no",
            ],
            capture_output=True,
            text=True,
            env={
                **__import__("os").environ,
                "DATABASE_URL": "postgresql://test:test@localhost:5432/testdb",
                "OPENAI_API_KEY": "sk-test-key",
            },
        )
        if not Path("coverage.json").exists():
            return {}
        data = json.loads(Path("coverage.json").read_text())
    else:
        data = json.loads(coverage_json.read_text())

    result = {}
    for filepath, info in data.get("files", {}).items():
        pct = info.get("summary", {}).get("percent_covered", 0)
        result[filepath] = round(pct, 2)
    return result


if not BASELINE_FILE.exists():
    print("✓ Coverage Fortress: no baseline yet")
    sys.exit(0)

baseline = json.loads(BASELINE_FILE.read_text())
python_baseline = baseline.get("python", {})

current = get_current_coverage()
if not current:
    print("✓ Coverage Fortress: no coverage data")
    sys.exit(0)

violations = []
for filepath, pct in current.items():
    base_pct = python_baseline.get(filepath)
    if base_pct is None:
        if pct < FLOOR:
            violations.append(f"  NEW {filepath}: {pct}% < {FLOOR}% floor")
    else:
        if pct < base_pct - TOLERANCE:
            violations.append(f"  REGRESSION {filepath}: {pct}% < baseline {base_pct}%")

if violations:
    print("✗ Coverage Fortress violations:", file=sys.stderr)
    for v in violations:
        print(v, file=sys.stderr)
    sys.exit(1)

print(f"✓ Coverage Fortress: {len(current)} file(s) meet ratchet requirements")
