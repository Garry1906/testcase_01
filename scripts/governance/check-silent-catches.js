#!/usr/bin/env node
/**
 * Iron Dome Ratchet — silent/empty catch blocks
 * Blocks: } catch (e) {} or } catch { // nothing }
 */

const fs = require('fs');
const path = require('path');

const BASELINE_FILE = '.memory-layer/baselines/type-safety.json';

function countSilentCatches(dir) {
  let count = 0;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(f)) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(f) && !f.endsWith('.d.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        // catch block with only whitespace/comments
        const silentCatch = content.match(/catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*)?\s*\}/g) || [];
        count += silentCatch.length;
      }
    }
  }
  walk(dir);
  return count;
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.log('✓ Silent catches: no baseline yet');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const current = countSilentCatches('src');
const limit = baseline.silent_catches ?? 999;

if (current > limit) {
  console.error(`✗ Silent catches increased: ${limit} → ${current}. Add proper error handling.`);
  process.exit(1);
}

console.log(`✓ Silent catches: ${current}/${limit} (baseline holds)`);
process.exit(0);
