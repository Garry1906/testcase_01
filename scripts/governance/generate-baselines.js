#!/usr/bin/env node
/**
 * Generate/update governance baselines.
 * Run: node scripts/governance/generate-baselines.js
 *
 * Creates:
 *   .memory-layer/baselines/type-safety.json  — any count, eslint-disable, silent catches
 *   .memory-layer/baselines/mock-tax.json     — test LOC ratio
 *   .memory-layer/baselines/coverage.json     — per-file coverage from last run
 *   .memory-layer/baselines/clone-count.json  — duplicate code count
 *   .memory-layer/baselines/guardrails.json   — current file sizes
 *   .memory-layer/baselines/code-health.json  — orphan count
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

fs.mkdirSync('.memory-layer/baselines', { recursive: true });

// ── helper ──────────────────────────────────────────────────────────────────

function countInFiles(dir, exts, pattern) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules','dist','.git','coverage','__pycache__'].includes(f)) walk(full);
      else if (exts.some(e => full.endsWith(e)) && !full.endsWith('.d.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        count += (content.match(pattern) || []).length;
      }
    }
  }
  walk(dir);
  return count;
}

function countLOC(dir, exts) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules','dist','.git','coverage','__pycache__'].includes(f)) walk(full);
      else if (exts.some(e => full.endsWith(e))) count += fs.readFileSync(full, 'utf8').split('\n').length;
    }
  }
  walk(dir);
  return count;
}

function countClones(dir, exts, minLines) {
  const seen = new Map();
  let clones = 0;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules','dist','.git','coverage','__pycache__'].includes(f)) walk(full);
      else if (exts.some(e => full.endsWith(e)) && !full.endsWith('.d.ts')) {
        const lines = fs.readFileSync(full, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
        for (let i = 0; i <= lines.length - minLines; i++) {
          const chunk = lines.slice(i, i + minLines).join('\n');
          const hash = crypto.createHash('md5').update(chunk).digest('hex');
          if (seen.has(hash)) clones++; else seen.set(hash, full);
        }
      }
    }
  }
  if (fs.existsSync(dir)) walk(dir);
  return clones;
}

// ── type-safety baseline ──────────────────────────────────────────────���──────

const typeSafety = {
  generated_at: new Date().toISOString(),
  any_count: countInFiles('src', ['.ts','.tsx'], /: any\b|as any\b|<any>/g),
  silent_catches: countInFiles('src', ['.ts','.tsx','.js'], /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*)?\s*\}/g),
  eslint_disable: countInFiles('src', ['.ts','.tsx','.js'], /eslint-disable/g),
  python_type_holes: countInFiles('app', ['.py'], /: Any\b|# type: ignore/g),
  python_silent_catches: 0,
  python_noqa: countInFiles('app', ['.py'], /# noqa/g),
};
fs.writeFileSync('.memory-layer/baselines/type-safety.json', JSON.stringify(typeSafety, null, 2));
console.log('✓ type-safety.json:', typeSafety);

// ── mock-tax baseline ─────────────────────────────────────────────────────────

const srcLOC = countLOC('src', ['.ts','.tsx']) + countLOC('app', ['.py']);
const testLOC = countLOC('tests', ['.ts','.tsx','.py']) + countLOC('src/__tests__', ['.ts','.tsx']);
const mockTax = {
  generated_at: new Date().toISOString(),
  source_loc: srcLOC,
  test_loc: testLOC,
  ratio: srcLOC > 0 ? parseFloat((testLOC / srcLOC).toFixed(2)) : 0,
};
fs.writeFileSync('.memory-layer/baselines/mock-tax.json', JSON.stringify(mockTax, null, 2));
console.log('✓ mock-tax.json:', mockTax);

// ── clone-count baseline ──────────────────────────────────────────────────────

const cloneCount = {
  generated_at: new Date().toISOString(),
  clone_count: countClones('src', ['.ts','.tsx','.js'], 6),
  python_clone_count: countClones('app', ['.py'], 6),
};
fs.writeFileSync('.memory-layer/baselines/clone-count.json', JSON.stringify(cloneCount, null, 2));
console.log('✓ clone-count.json:', cloneCount);

// ── coverage baseline (from last jest run) ────────────────────────────────────

const summaryFile = 'coverage/coverage-summary.json';
let coverageBaseline = { generated_at: new Date().toISOString(), typescript: {}, python: {} };
if (fs.existsSync(summaryFile)) {
  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  for (const [file, data] of Object.entries(summary)) {
    if (file !== 'total') coverageBaseline.typescript[file] = data.lines.pct;
  }
}
fs.writeFileSync('.memory-layer/baselines/coverage.json', JSON.stringify(coverageBaseline, null, 2));
console.log('✓ coverage.json: typescript files:', Object.keys(coverageBaseline.typescript).length);

// ── guardrails baseline ───────────────────────────────────────────────────────

function getFileSizes(dir, exts) {
  const sizes = {};
  if (!fs.existsSync(dir)) return sizes;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules','dist','.git','coverage','__pycache__'].includes(f)) walk(full);
      else if (exts.some(e => full.endsWith(e)) && !full.endsWith('.d.ts')) {
        sizes[path.relative(process.cwd(), full)] = fs.readFileSync(full, 'utf8').split('\n').length;
      }
    }
  }
  walk(dir);
  return sizes;
}

const guardrails = {
  generated_at: new Date().toISOString(),
  files: { ...getFileSizes('src', ['.ts','.tsx']), ...getFileSizes('app', ['.py']) },
};
fs.writeFileSync('.memory-layer/baselines/guardrails.json', JSON.stringify(guardrails, null, 2));
console.log('✓ guardrails.json: files:', Object.keys(guardrails.files).length);

// ── code-health baseline ──────────────────────────────────────────────────────

const codeHealth = {
  generated_at: new Date().toISOString(),
  orphan_count: 0,
  note: 'Orphan detection is non-blocking (warning only)',
};
fs.writeFileSync('.memory-layer/baselines/code-health.json', JSON.stringify(codeHealth, null, 2));
console.log('✓ code-health.json');

console.log('\nAll baselines generated in .memory-layer/baselines/');
