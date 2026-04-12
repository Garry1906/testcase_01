#!/usr/bin/env node
/**
 * Governance Metrics Report — renders .memory-layer/metrics/latest.json as Markdown.
 */

const fs = require('fs');

const METRICS_FILE = '.memory-layer/metrics/latest.json';

if (!fs.existsSync(METRICS_FILE)) {
  console.log('No metrics yet. Run: node scripts/governance/collect-metrics.js');
  process.exit(0);
}

const m = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));

const THRESHOLDS = {
  any_count: { limit: 0, label: 'TypeScript `any` usage' },
  eslint_disable: { limit: 0, label: 'eslint-disable suppressions' },
  silent_catches: { limit: 0, label: 'Silent catch blocks' },
  python_type_holes: { limit: 0, label: 'Python type holes' },
  python_noqa: { limit: 0, label: 'Python noqa suppressions' },
};

const rows = Object.entries(THRESHOLDS).map(([key, { limit, label }]) => {
  const val = m[key] ?? 0;
  const status = val <= limit ? '✓' : '✗';
  return `| ${status} | ${label} | ${val} | ${limit} |`;
});

const report = `
# Governance Metrics Report

Generated: ${m.collected_at}

## Quality Gates

| Status | Metric | Current | Limit |
|--------|--------|---------|-------|
${rows.join('\n')}

## Codebase Size

| Metric | Value |
|--------|-------|
| Source LOC (TS) | ${m.source_loc} |
| Test LOC | ${m.test_loc} |
| Mock Tax Ratio | ${m.source_loc > 0 ? (m.test_loc / m.source_loc).toFixed(2) : 'N/A'}× |
`.trim();

console.log(report);

const outFile = '.memory-layer/metrics/report.md';
fs.writeFileSync(outFile, report + '\n');
console.log(`\nReport written to ${outFile}`);
process.exit(0);
