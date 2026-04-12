#!/usr/bin/env python3
"""Dependency Health — detect circular import cycles in Python source"""

import ast
import sys
from pathlib import Path


def build_import_graph(directory: Path) -> dict[str, list[str]]:
    graph = {}
    for filepath in directory.rglob("*.py"):
        if any(p in str(filepath) for p in ["__pycache__", ".venv", "venv"]):
            continue
        try:
            tree = ast.parse(filepath.read_text())
        except SyntaxError:
            continue
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                # Convert module path to file path
                parts = node.module.split(".")
                candidate = directory / Path(*parts)
                for ext in [".py", "/__init__.py"]:
                    full = Path(str(candidate) + ext)
                    if full.exists():
                        imports.append(str(full))
                        break
        graph[str(filepath)] = imports
    return graph


def detect_cycles(graph: dict) -> list[list[str]]:
    cycles = []
    visited = set()
    stack = set()

    def dfs(node: str, path: list[str]):
        if node in stack:
            start = path.index(node)
            cycles.append(path[start:] + [node])
            return
        if node in visited:
            return
        visited.add(node)
        stack.add(node)
        for dep in graph.get(node, []):
            dfs(dep, path + [node])
        stack.discard(node)

    for node in graph:
        dfs(node, [])
    return cycles


app_dir = Path("app")
if not app_dir.exists():
    print("✓ Circular deps: no app/ directory")
    sys.exit(0)

graph = build_import_graph(app_dir)
cycles = detect_cycles(graph)

if cycles:
    print(f"✗ Circular dependencies detected ({len(cycles)}):", file=sys.stderr)
    for cycle in cycles:
        names = [Path(f).name for f in cycle]
        print("  " + " → ".join(names), file=sys.stderr)
    sys.exit(1)

print(f"✓ Circular deps: no cycles found in {len(graph)} modules")
