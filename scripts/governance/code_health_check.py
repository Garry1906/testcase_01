#!/usr/bin/env python3
"""Code Health — orphan file detection for Python source"""

import ast
import sys
from pathlib import Path


def get_source_files(directory: Path) -> list[Path]:
    return [
        f
        for f in directory.rglob("*.py")
        if not any(p in str(f) for p in ["__pycache__", ".venv", "venv", "__init__"])
        and "test_" not in f.name
    ]


def get_all_imports(files: list[Path]) -> set[str]:
    imported = set()
    for filepath in files:
        try:
            tree = ast.parse(filepath.read_text())
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                parts = node.module.split(".")
                candidate = Path(*parts)
                imported.add(str(candidate) + ".py")
                imported.add(str(candidate / "__init__.py"))
    return imported


app_dir = Path("app")
if not app_dir.exists():
    print("✓ Code health: no app/ directory")
    sys.exit(0)

source_files = get_source_files(app_dir)
if len(source_files) <= 1:
    print("✓ Code health: single-file project — skip orphan check")
    sys.exit(0)

imported = get_all_imports(source_files)
orphans = [
    f
    for f in source_files
    if not any(imp_path in str(f) for imp_path in imported)
    and f.name not in ("config.py", "settings.py", "main.py", "app.py")
]

if orphans:
    print(f"⚠ Code health: {len(orphans)} potentially orphaned file(s):")
    for f in orphans:
        print(f"  {f}")

print(f"✓ Code health: {len(source_files)} source files analyzed")
