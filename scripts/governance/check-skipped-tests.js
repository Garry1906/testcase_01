#!/usr/bin/env node
/**
 * Test Discipline — max 5% skipped tests
 */

const fs = require('fs');
const path = require('path');

function scanDir(dir, ext) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(f)) {
        walk(full);
      } else if (ext.some(e => f.endsWith(e))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

const testFiles = [
  ...scanDir('tests', ['.test.ts', '.test.js', '.spec.ts', '.spec.js']),
  ...scanDir('src/__tests__', ['.test.ts', '.test.js']),
];

let totalTests = 0;
let skippedTests = 0;

for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const tests = content.match(/\b(it|test)\s*\(/g) || [];
  const skipped = content.match(/\b(it\.skip|test\.skip|xit|xtest|xdescribe|describe\.skip)\s*\(/g) || [];
  totalTests += tests.length;
  skippedTests += skipped.length;
}

if (totalTests === 0) {
  console.log('✓ Skipped tests: no tests found');
  process.exit(0);
}

const pct = (skippedTests / totalTests) * 100;
const MAX_PCT = 5;

console.log(`  Tests: ${totalTests}, Skipped: ${skippedTests} (${pct.toFixed(1)}%)`);

if (pct > MAX_PCT) {
  console.error(`✗ Too many skipped tests: ${pct.toFixed(1)}% > ${MAX_PCT}% limit`);
  process.exit(1);
}

console.log(`✓ Skipped tests: within ${MAX_PCT}% limit`);
process.exit(0);
