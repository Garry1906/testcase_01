#!/usr/bin/env node
/**
 * Buddy System — every source file must have an integration test counterpart.
 * Checks staged .ts files in src/ for corresponding tests/integration/*.test.ts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getStagedSourceFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=A', { encoding: 'utf8' });
    return output.trim().split('\n')
      .filter(f => f.startsWith('src/') && f.endsWith('.ts') && !f.includes('__tests__') && !f.endsWith('.d.ts'));
  } catch { return []; }
}

const newSourceFiles = getStagedSourceFiles();

if (newSourceFiles.length === 0) {
  console.log('✓ Integration pairing: no new source files added');
  process.exit(0);
}

const missing = [];

for (const srcFile of newSourceFiles) {
  const base = path.basename(srcFile, '.ts');
  const integrationFile = `tests/integration/${base}.integration.test.ts`;
  if (!fs.existsSync(integrationFile)) {
    missing.push(`  ${srcFile} → missing ${integrationFile}`);
  }
}

if (missing.length > 0) {
  console.error('✗ Buddy System: new source files missing integration tests:');
  missing.forEach(m => console.error(m));
  console.error('  Add an integration test before committing new source files.');
  process.exit(1);
}

console.log(`✓ Integration pairing: all ${newSourceFiles.length} new file(s) have integration tests`);
process.exit(0);
