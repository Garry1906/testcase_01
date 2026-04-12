#!/usr/bin/env node
/**
 * Governance Tax Tracking — collect metrics from the current codebase.
 * Writes to .memory-layer/metrics/latest.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function countInFiles(dir, ext, pattern) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage', '__pycache__'].includes(f)) {
        walk(full);
      } else if (ext.some(e => full.endsWith(e))) {
        const content = fs.readFileSync(full, 'utf8');
        count += (content.match(pattern) || []).length;
      }
    }
  }
  walk(dir);
  return count;
}

function countLOC(dir, ext) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage', '__pycache__'].includes(f)) {
        walk(full);
      } else if (ext.some(e => full.endsWith(e))) {
        count += fs.readFileSync(full, 'utf8').split('\n').length;
      }
    }
  }
  walk(dir);
  return count;
}

const metrics = {
  collected_at: new Date().toISOString(),
  any_count: countInFiles('src', ['.ts', '.tsx'], /: any\b|as any\b|<any>/g),
  eslint_disable: countInFiles('src', ['.ts', '.tsx', '.js'], /eslint-disable/g),
  silent_catches: countInFiles('src', ['.ts', '.tsx', '.js'], /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*)?\s*\}/g),
  source_loc: countLOC('src', ['.ts', '.tsx']),
  test_loc: countLOC('tests', ['.ts', '.tsx', '.py']) + countLOC('src/__tests__', ['.ts', '.tsx']),
  python_type_holes: countInFiles('app', ['.py'], /: Any\b|# type: ignore/g),
  python_noqa: countInFiles('app', ['.py'], /# noqa/g),
};

fs.mkdirSync('.memory-layer/metrics', { recursive: true });
fs.writeFileSync('.memory-layer/metrics/latest.json', JSON.stringify(metrics, null, 2));

console.log('Governance metrics collected:');
Object.entries(metrics).forEach(([k, v]) => {
  if (k !== 'collected_at') console.log(`  ${k}: ${v}`);
});

process.exit(0);
