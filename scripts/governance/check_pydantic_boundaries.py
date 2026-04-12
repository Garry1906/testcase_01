#!/usr/bin/env python3
"""Schema Validation Gate — system boundaries must use Pydantic validation"""

import subprocess
import sys
from pathlib import Path

BOUNDARY_INDICATORS = [
    "request.json",
    "request.form",
    "request.args",
    "os.environ",
    "json.loads",
]


def get_staged_source_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
            capture_output=True,
            text=True,
        )
        return [
            Path(f)
            for f in result.stdout.strip().split("\n")
            if f.startswith("app/")
            and f.endswith(".py")
            and "test" not in f
            and Path(f).exists()
        ]
    except Exception:
        return []


files = get_staged_source_files()
violations = []

for filepath in files:
    content = filepath.read_text()
    has_pydantic = "BaseModel" in content or "pydantic" in content
    has_boundary = any(indicator in content for indicator in BOUNDARY_INDICATORS)

    if has_boundary and not has_pydantic:
        violations.append(
            f"  {filepath}: boundary data accessed without Pydantic model"
        )

if violations:
    print("✗ Schema Validation Gate:", file=sys.stderr)
    for v in violations:
        print(v, file=sys.stderr)
    sys.exit(1)

print("✓ Schema boundaries: all boundary files use Pydantic validation")
