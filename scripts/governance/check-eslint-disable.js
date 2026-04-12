#!/usr/bin/env node
/**
 * Escape Hatch Gate — no new eslint-disable suppressions
 */

const fs = require('fs');
const path = require('path');

const BASELINE_FILE = '.memory-layer/baselines/type-safety.json';

function countEslintDisable(dir) {
  let count = 0;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(f)) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(f)) {
        const content = fs.readFileSync(full, 'utf8');
        count += (content.match(/eslint-disable/g) || []).length;
      }
    }
  }
  walk(dir);
  return count;
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.log('✓ Eslint-disable: no baseline yet');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const current = countEslintDisable('src');
const limit = baseline.eslint_disable ?? 999;

if (current > limit) {
  console.error(`✗ eslint-disable count increased: ${limit} → ${current}. Fix lint errors instead.`);
  process.exit(1);
}

console.log(`✓ eslint-disable: ${current}/${limit} (baseline holds)`);
process.exit(0);
