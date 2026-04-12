#!/usr/bin/env python3
"""Governance Metrics Report — render latest metrics as Markdown"""

import json
import sys
from pathlib import Path

METRICS_FILE = Path(".memory-layer/metrics/latest.json")

if not METRICS_FILE.exists():
    print("No metrics yet. Run: python3 scripts/governance/collect_metrics.py")
    sys.exit(0)

m = json.loads(METRICS_FILE.read_text())

THRESHOLDS = {
    "ts_any_count": (0, "TypeScript `any` usage"),
    "ts_eslint_disable": (0, "eslint-disable suppressions"),
    "python_type_holes": (0, "Python type holes"),
    "python_noqa": (0, "Python noqa suppressions"),
}

rows = []
for key, (limit, label) in THRESHOLDS.items():
    val = m.get(key, 0)
    status = "✓" if val <= limit else "✗"
    rows.append(f"| {status} | {label} | {val} | {limit} |")

py_loc = m.get("source_loc_py", 0)
ts_loc = m.get("source_loc_ts", 0)
py_test = m.get("test_loc_py", 0)
ts_test = m.get("test_loc_ts", 0)
total_src = py_loc + ts_loc
total_test = py_test + ts_test

report = f"""
# Governance Metrics Report

Generated: {m.get("collected_at", "unknown")}

## Quality Gates

| Status | Metric | Current | Limit |
|--------|--------|---------|-------|
{chr(10).join(rows)}

## Codebase Size

| Metric | Python | TypeScript | Total |
|--------|--------|------------|-------|
| Source LOC | {py_loc} | {ts_loc} | {total_src} |
| Test LOC | {py_test} | {ts_test} | {total_test} |
| Mock Tax Ratio | {(py_test / py_loc):.2f}× | {(ts_test / ts_loc):.2f}× | {(total_test / total_src):.2f}× |
""".strip()

print(report)
out = Path(".memory-layer/metrics/report.md")
out.write_text(report + "\n")
print(f"\nReport written to {out}")
