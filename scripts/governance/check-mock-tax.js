#!/usr/bin/env node
/**
 * Rising Tide — Mock Tax (2x Rule)
 * Test LOC must not exceed 2x source LOC.
 */

const fs = require('fs');
const path = require('path');

function countLOC(dir, extensions = ['.ts', '.js']) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage', '__pycache__'].includes(f)) {
        walk(full);
      } else if (extensions.some(ext => f.endsWith(ext)) && !f.endsWith('.d.ts')) {
        const lines = fs.readFileSync(full, 'utf8').split('\n').length;
        count += lines;
      }
    }
  }
  walk(dir);
  return count;
}

const BASELINE_FILE = '.memory-layer/baselines/mock-tax.json';

const sourceLOC = countLOC('src', ['.ts', '.tsx']);
const testLOC = countLOC('tests', ['.ts', '.tsx'])
  + countLOC('src/__tests__', ['.ts', '.tsx']);

if (sourceLOC === 0) {
  console.log('✓ Mock tax: no source files found');
  process.exit(0);
}

const currentRatio = testLOC / sourceLOC;

// If a baseline exists, use typescript-specific section as the ratchet ceiling
let ratioLimit = 2.0;
if (fs.existsSync(BASELINE_FILE)) {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  const ts = baseline.typescript || {};
  const baseSrc = ts.source_loc || baseline.source_loc || 0;
  const baseTest = ts.test_loc || baseline.test_loc || 0;
  if (baseSrc > 0) {
    const baseRatio = baseTest / baseSrc;
    ratioLimit = Math.max(ratioLimit, baseRatio + 0.1);
  }
}

console.log(`  Source LOC: ${sourceLOC}, Test LOC: ${testLOC}, Ratio: ${currentRatio.toFixed(2)}× (limit: ${ratioLimit.toFixed(2)}×)`);

if (currentRatio > ratioLimit) {
  console.error(`✗ Mock Tax violation: ratio ${currentRatio.toFixed(2)}× exceeds limit ${ratioLimit.toFixed(2)}×`);
  console.error('  Replace bloated unit mocks with integration tests.');
  process.exit(1);
}

console.log(`✓ Mock Tax: within ratchet limit`);
process.exit(0);
