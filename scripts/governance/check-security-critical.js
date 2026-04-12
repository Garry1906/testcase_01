#!/usr/bin/env node
/**
 * Security Review Gate — @security-critical blocks require human review comment.
 * Staged files with @security-critical annotation must have a reviewer override:
 * // security-review-approved: <reviewer> <date>
 */

const fs = require('fs');
const { execSync } = require('child_process');

function getStagedFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
  } catch { return []; }
}

// Only check source code files, not config/yaml/markdown
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.py'];
const files = getStagedFiles()
  .filter(f => fs.existsSync(f) && SOURCE_EXTS.some(ext => f.endsWith(ext)));
const violations = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('@security-critical')) {
    if (!content.includes('security-review-approved:')) {
      violations.push(`  ${file}: has @security-critical but no security-review-approved comment`);
    }
  }
}

if (violations.length > 0) {
  console.error('✗ Security Review Gate:');
  violations.forEach(v => console.error(v));
  console.error('  Add: // security-review-approved: <reviewer> <date>');
  process.exit(1);
}

console.log('✓ Security review: no unapproved security-critical blocks');
process.exit(0);
