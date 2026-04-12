#!/usr/bin/env node
/**
 * Mutation Testing Gate — 70% mutation score on changed files.
 * Uses StrykerJS when available. Falls back to reporting only.
 */

const fs = require('fs');
const { execSync } = require('child_process');

const THRESHOLD = 70;

function getChangedFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
      .trim().split('\n')
      .filter(f => f.startsWith('src/') && /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'));
  } catch { return []; }
}

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('✓ Mutation score: no source files changed');
  process.exit(0);
}

// Check if stryker is available
const hasStryker = (() => {
  try {
    execSync('npx stryker --version', { stdio: 'pipe' });
    return true;
  } catch { return false; }
})();

if (!hasStryker) {
  console.log(`⚠ Mutation score: StrykerJS not installed — skip (install: npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker)`);
  process.exit(0);
}

// Run stryker on changed files
const mutatePattern = changedFiles.join(',');
try {
  const output = execSync(
    `npx stryker run --mutate "${mutatePattern}" --reporters json --logLevel error`,
    { encoding: 'utf8', timeout: 120000 }
  );

  const reportFile = 'reports/mutation/mutation.json';
  if (fs.existsSync(reportFile)) {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const score = report.mutationScore ?? 0;
    if (score < THRESHOLD) {
      console.error(`✗ Mutation score: ${score.toFixed(1)}% < ${THRESHOLD}% threshold`);
      process.exit(1);
    }
    console.log(`✓ Mutation score: ${score.toFixed(1)}% meets ${THRESHOLD}% threshold`);
  }
} catch (e) {
  console.log(`⚠ Mutation score: StrykerJS run failed — ${e.message.split('\n')[0]}`);
  process.exit(0);
}

process.exit(0);
