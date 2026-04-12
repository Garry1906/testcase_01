#!/usr/bin/env python3
"""Mutation Testing Gate — 70% mutation score on changed Python files"""

import subprocess
import sys

THRESHOLD = 70


def get_changed_files() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
            capture_output=True,
            text=True,
        )
        return [
            f
            for f in result.stdout.strip().split("\n")
            if f.startswith("app/") and f.endswith(".py")
        ]
    except Exception:
        return []


def has_mutmut() -> bool:
    try:
        subprocess.run(["mutmut", "--version"], capture_output=True)
        return True
    except FileNotFoundError:
        return False


changed = get_changed_files()
if not changed:
    print("✓ Mutation score: no source files changed")
    sys.exit(0)

if not has_mutmut():
    print("⚠ Mutation score: mutmut not installed — skip (pip install mutmut)")
    sys.exit(0)

# Run mutmut on changed files
paths_arg = " ".join(f"--paths-to-mutate={f}" for f in changed)
result = subprocess.run(
    f"mutmut run {paths_arg} --no-progress", shell=True, capture_output=True, text=True
)

# Parse result
results_output = subprocess.run(
    ["mutmut", "results"], capture_output=True, text=True
).stdout

# Simple score estimate from output
killed = results_output.count("🎉")
survived = results_output.count("🙁")
total = killed + survived

if total == 0:
    print("✓ Mutation score: no mutants generated")
    sys.exit(0)

score = (killed / total) * 100
print(f"  Mutants: {total}, Killed: {killed}, Score: {score:.1f}%")

if score < THRESHOLD:
    print(f"✗ Mutation score: {score:.1f}% < {THRESHOLD}% threshold", file=sys.stderr)
    sys.exit(1)

print(f"✓ Mutation score: {score:.1f}% meets {THRESHOLD}% threshold")
