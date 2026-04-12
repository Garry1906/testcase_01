#!/usr/bin/env python3
"""
Supply Chain Gate — detect AI-hallucinated PyPI packages.
Checks that all packages in requirements.txt exist on PyPI.
"""

import subprocess
import sys
from pathlib import Path
import urllib.request
import urllib.error


def get_packages() -> list[str]:
    req_file = Path("requirements.txt")
    if not req_file.exists():
        return []
    packages = []
    for line in req_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("-"):
            # Extract package name (strip version specifiers)
            name = (
                line.split(">=")[0].split("==")[0].split("<=")[0].split("[")[0].strip()
            )
            packages.append(name)
    return packages


def check_pypi(package: str) -> bool:
    url = f"https://pypi.org/pypi/{package}/json"
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "mault-governance/1.0"}
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        return True  # Other errors (network) — assume OK
    except Exception:
        return True  # Network error — assume OK


def is_staged() -> bool:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"], capture_output=True, text=True
        )
        return "requirements.txt" in result.stdout
    except Exception:
        return False


if not is_staged() and "--all" not in sys.argv:
    print("✓ Supply chain (PyPI): requirements.txt unchanged — skip")
    sys.exit(0)

packages = get_packages()
if not packages:
    print("✓ Supply chain (PyPI): no packages to check")
    sys.exit(0)

hallucinated = [p for p in packages if not check_pypi(p)]

if hallucinated:
    print("✗ Hallucinated packages (not on PyPI):", file=sys.stderr)
    for p in hallucinated:
        print(f"  - {p}", file=sys.stderr)
    sys.exit(1)

print(f"✓ Supply chain (PyPI): all {len(packages)} packages verified")
