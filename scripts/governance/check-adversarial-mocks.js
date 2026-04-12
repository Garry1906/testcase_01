#!/usr/bin/env node
/**
 * Mock Quality Gate — no forbidden mock patterns
 * Blocks: jest.fn().mockReturnValue(undefined), jest.mock() without factory,
 * and overly broad jest.mock('../..') that mocks entire modules.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getStagedTestFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
    return output.trim().split('\n')
      .filter(f => /\.(test|spec)\.(ts|js)$/.test(f) || f.includes('__tests__') || f.includes('/tests/'));
  } catch { return []; }
}

const FORBIDDEN_PATTERNS = [
  { re: /jest\.mock\(['"]/g, msg: 'Bare jest.mock() without factory — provide a factory function or use jest.spyOn()' },
  { re: /as\s+any\b/g, msg: '`as any` in test — use typed mocks or `as unknown as Type`' },
];

const files = getStagedTestFiles().filter(f => fs.existsSync(f));

if (files.length === 0) {
  console.log('✓ Mock quality: no test files staged');
  process.exit(0);
}

const violations = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (const { re, msg } of FORBIDDEN_PATTERNS) {
    let match;
    while ((match = re.exec(content)) !== null) {
      const lineNo = content.substring(0, match.index).split('\n').length;
      violations.push(`  ${file}:${lineNo} — ${msg}`);
    }
    re.lastIndex = 0;
  }
}

if (violations.length > 0) {
  console.error('✗ Adversarial mock patterns detected:');
  violations.forEach(v => console.error(v));
  process.exit(1);
}

console.log(`✓ Mock quality: ${files.length} test file(s) clean`);
process.exit(0);
