#!/usr/bin/env node
/**
 * Coverage Fortress — per-file coverage ratchet
 * New files: ≥80% floor. Existing files: cannot regress > 0.2%.
 * Baseline: .memory-layer/baselines/coverage.json
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const BASELINE_FILE = '.memory-layer/baselines/coverage.json';
const FLOOR = 80;
const TOLERANCE = 0.2;

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return {};
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
}

function loadCurrentCoverage() {
  const summaryFile = 'coverage/coverage-summary.json';
  if (!existsSync(summaryFile)) return null;
  const raw = JSON.parse(readFileSync(summaryFile, 'utf8'));
  const result = {};
  for (const [file, data] of Object.entries(raw)) {
    if (file === 'total') continue;
    result[file] = data.lines.pct;
  }
  return result;
}

const baseline = loadBaseline();
const current = loadCurrentCoverage();

if (!current) {
  console.log('✓ Coverage Fortress: no coverage data (run tests with --coverage first)');
  process.exit(0);
}

const violations = [];

for (const [file, pct] of Object.entries(current)) {
  const baselinePct = baseline[file];
  if (baselinePct === undefined) {
    // New file — must meet floor
    if (pct < FLOOR) {
      violations.push(`  NEW ${file}: ${pct}% < ${FLOOR}% floor`);
    }
  } else {
    // Existing file — ratchet check
    if (pct < baselinePct - TOLERANCE) {
      violations.push(`  REGRESSION ${file}: ${pct}% < baseline ${baselinePct}% (tolerance ±${TOLERANCE}%)`);
    }
  }
}

if (violations.length > 0) {
  console.error('✗ Coverage Fortress violations:');
  violations.forEach(v => console.error(v));
  process.exit(1);
}

const fileCount = Object.keys(current).length;
console.log(`✓ Coverage Fortress: ${fileCount} file(s) meet ratchet requirements`);
process.exit(0);
