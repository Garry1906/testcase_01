#!/usr/bin/env python3
"""
SRP Guardrails — file LOC, function LOC for Python
Thresholds: source ≤600 LOC, test ≤300 LOC, config ≤75 LOC
Function: ≤50 LOC
"""

import ast
import sys
from pathlib import Path

FILE_LIMITS = {"source": 600, "test": 300, "config": 75}
FUNC_LOC_LIMIT = 50


def classify_file(path: Path) -> str:
    name = path.name
    if "test" in name or "spec" in name:
        return "test"
    if name in ("pyproject.toml", "setup.cfg", ".env.example"):
        return "config"
    return "source"


def count_function_violations(filepath: Path) -> list[str]:
    violations = []
    try:
        tree = ast.parse(filepath.read_text())
    except SyntaxError:
        return violations
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            loc = (node.end_lineno or node.lineno) - node.lineno + 1
            if loc > FUNC_LOC_LIMIT:
                rel = filepath.relative_to(Path.cwd())
                violations.append(
                    f"  {rel}:{node.lineno} function '{node.name}' is {loc} LOC (limit: {FUNC_LOC_LIMIT})"
                )
    return violations


def main():
    files = [Path(f) for f in sys.argv[1:] if Path(f).exists()]
    if not files:
        print("✓ Guardrails: no files to check")
        sys.exit(0)

    violations = []
    for filepath in files:
        if filepath.suffix != ".py":
            continue
        kind = classify_file(filepath)
        limit = FILE_LIMITS[kind]
        loc = len(filepath.read_text().splitlines())
        if loc > limit:
            violations.append(f"  {filepath}: {loc} LOC exceeds {kind} limit ({limit})")
        violations.extend(count_function_violations(filepath))

    if violations:
        print("✗ SRP Guardrails violations:")
        for v in violations:
            print(v, file=sys.stderr)
        sys.exit(1)

    print(f"✓ Guardrails: {len(files)} file(s) within SRP limits")


if __name__ == "__main__":
    main()
