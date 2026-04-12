#!/usr/bin/env node
/**
 * Iron Dome Ratchet — TypeScript `any` usage
 * Reads baseline from .memory-layer/baselines/type-safety.json
 * Blocks commits that INCREASE the any count above baseline.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASELINE_FILE = '.memory-layer/baselines/type-safety.json';

function countAnyUsage(dir) {
  const srcFiles = [];
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(f)) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts')) {
        srcFiles.push(full);
      }
    }
  }
  walk(dir);

  let count = 0;
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const anyMatches = (content.match(/: any\b/g) || []).length
      + (content.match(/as any\b/g) || []).length
      + (content.match(/<any>/g) || []).length;
    count += anyMatches;
  }
  return count;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
}

const baseline = loadBaseline();
if (!baseline) {
  console.log('✓ Iron Dome: no baseline yet (run scripts/governance/generate-baselines.js)');
  process.exit(0);
}

const current = countAnyUsage('src');
const limit = baseline.any_count;

if (current > limit) {
  console.error(`✗ Iron Dome: any usage increased from baseline ${limit} → ${current}`);
  console.error('  Fix: replace `any` with proper types, then run generate-baselines.js if intentional');
  process.exit(1);
}

console.log(`✓ Iron Dome: any count ${current}/${limit} (baseline holds)`);
process.exit(0);
