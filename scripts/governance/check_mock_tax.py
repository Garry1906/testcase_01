#!/usr/bin/env python3
"""
Rising Tide — Mock Tax (2x Rule) for Python
Test LOC must not exceed 2x source LOC
"""

import json
import sys
from pathlib import Path


def count_loc(directory: Path, suffix: str = ".py") -> int:
    total = 0
    if not directory.exists():
        return 0
    for f in directory.rglob(f"*{suffix}"):
        if any(p in str(f) for p in ["__pycache__", ".venv", "venv"]):
            continue
        total += len(f.read_text().splitlines())
    return total


BASELINE_FILE = Path(".memory-layer/baselines/mock-tax.json")

app_loc = count_loc(Path("app"))
test_loc = count_loc(Path("tests"))

if app_loc == 0:
    print("✓ Mock tax: no source files found")
    sys.exit(0)

current_ratio = test_loc / app_loc

# Use python-specific baseline ratio as ratchet ceiling (Amnesty Protocol)
ratio_limit = 2.0
if BASELINE_FILE.exists():
    baseline = json.loads(BASELINE_FILE.read_text())
    py_section = baseline.get("python", {})
    base_src = py_section.get("source_loc", baseline.get("source_loc", 0))
    base_test = py_section.get("test_loc", baseline.get("test_loc", 0))
    if base_src > 0:
        baseline_ratio = base_test / base_src
        ratio_limit = max(ratio_limit, baseline_ratio + 0.1)

print(
    f"  Source LOC: {app_loc}, Test LOC: {test_loc}, Ratio: {current_ratio:.2f}× (limit: {ratio_limit:.2f}×)"
)

if current_ratio > ratio_limit:
    print(
        f"✗ Mock Tax violation: ratio {current_ratio:.2f}× exceeds limit {ratio_limit:.2f}×",
        file=sys.stderr,
    )
    print("  Replace bloated unit mocks with integration tests.", file=sys.stderr)
    sys.exit(1)

print("✓ Mock Tax: within ratchet limit")
