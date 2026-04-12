#!/usr/bin/env node
/**
 * Perception Check — detector/validator files must have behavioral tests.
 * Files matching: *detector*, *validator*, *guard*, *gate* need behavioral tests.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DETECTOR_PATTERNS = [/detector/i, /validator/i, /guard/i, /gate/i];

function getStagedSourceFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=A', { encoding: 'utf8' })
      .trim().split('\n')
      .filter(f => f.startsWith('src/') && /\.(ts|tsx)$/.test(f));
  } catch { return []; }
}

const newFiles = getStagedSourceFiles();
const perceptionFiles = newFiles.filter(f =>
  DETECTOR_PATTERNS.some(p => p.test(path.basename(f)))
);

if (perceptionFiles.length === 0) {
  console.log('✓ Behavioral pairing: no perception-critical files staged');
  process.exit(0);
}

const missing = [];
for (const file of perceptionFiles) {
  const base = path.basename(file, '.ts').replace(/\.(test|spec)$/, '');
  const behavioralFile = `tests/behavioral/${base}.behavioral.test.ts`;
  if (!fs.existsSync(behavioralFile)) {
    missing.push(`  ${file} → missing ${behavioralFile}`);
  }
}

if (missing.length > 0) {
  console.error('✗ Behavioral pairing: perception-critical files need behavioral tests:');
  missing.forEach(m => console.error(m));
  process.exit(1);
}

console.log(`✓ Behavioral pairing: ${perceptionFiles.length} file(s) have behavioral tests`);
process.exit(0);
