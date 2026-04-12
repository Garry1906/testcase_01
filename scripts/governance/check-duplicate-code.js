#!/usr/bin/env node
/**
 * DRY Enforcement — detects duplicate code blocks (clone detection).
 * Uses simple line-hash approach. Blocks if new clones exceed baseline.
 */

const fs = require('fs');
const crypto = require('crypto');

const BASELINE_FILE = '.memory-layer/baselines/clone-count.json';
const MIN_CLONE_LINES = 6;

function getSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = require('path').join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(f)) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(f) && !f.endsWith('.d.ts')) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

function extractChunks(content, n) {
  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && !l.startsWith('*'));
  const chunks = [];
  for (let i = 0; i <= lines.length - n; i++) {
    chunks.push(lines.slice(i, i + n).join('\n'));
  }
  return chunks;
}

function countClones(files) {
  const seen = new Map();
  let cloneCount = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const chunks = extractChunks(content, MIN_CLONE_LINES);
    for (const chunk of chunks) {
      const hash = crypto.createHash('md5').update(chunk).digest('hex');
      if (seen.has(hash)) {
        cloneCount++;
      } else {
        seen.set(hash, file);
      }
    }
  }
  return cloneCount;
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.log('✓ Duplicate code: no baseline yet');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const files = getSourceFiles('src');
const current = countClones(files);
const limit = baseline.clone_count;

if (current > limit + 2) {
  console.error(`✗ Clone count increased: ${limit} → ${current} (allowance: +2)`);
  console.error('  DRY violation: extract repeated code into shared utilities.');
  process.exit(1);
}

console.log(`✓ Duplicate code: ${current} clones (baseline: ${limit})`);
process.exit(0);
