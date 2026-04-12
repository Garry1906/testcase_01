#!/usr/bin/env python3
"""
TIA for Python — run only tests related to changed files.
In CI (IS_CI=true), always runs full test suite.
"""

import os
import subprocess
import sys


def get_changed_py_files() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "origin/master...HEAD"],
            capture_output=True,
            text=True,
        )
        return [
            f
            for f in result.stdout.strip().split("\n")
            if f.endswith(".py") and f.startswith("app/")
        ]
    except Exception:
        return []


def run_tests(test_args: list[str]) -> int:
    env = {
        **os.environ,
        "DATABASE_URL": os.environ.get(
            "DATABASE_URL", "postgresql://test:test@localhost:5432/testdb"
        ),
        "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", "sk-test-key"),
        "PYTHONPATH": os.getcwd(),
    }
    result = subprocess.run(["python3", "-m", "pytest"] + test_args, env=env)
    return result.returncode


is_ci = os.environ.get("IS_CI", "").lower() in ("1", "true", "yes") or os.environ.get(
    "CI"
)

if is_ci:
    print("CI mode: running full test suite (safety latch)")
    sys.exit(run_tests(["tests/", "-v", "--tb=short"]))

changed = get_changed_py_files()
if not changed:
    print("No Python source files changed — running all tests")
    sys.exit(run_tests(["tests/", "-q"]))

print(f"TIA: found {len(changed)} changed file(s), running related tests")
for f in changed:
    print(f"  {f}")

# pytest-testmon handles TIA automatically if installed
try:
    subprocess.run(
        ["python3", "-m", "pytest", "--testmon", "--version"],
        capture_output=True,
        check=True,
    )
    sys.exit(run_tests(["tests/", "--testmon", "-q"]))
except (subprocess.CalledProcessError, FileNotFoundError):
    print("pytest-testmon not available, running full suite")
    sys.exit(run_tests(["tests/", "-q"]))
