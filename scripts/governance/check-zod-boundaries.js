#!/usr/bin/env node
/**
 * Schema Validation Gate — system boundaries must use Zod validation.
 * Checks staged TS files: API route handlers and config loaders need schema validation.
 */

const fs = require('fs');
const { execSync } = require('child_process');

const BOUNDARY_PATTERNS = [
  /req\.body\b/,
  /req\.query\b/,
  /req\.params\b/,
  /JSON\.parse\s*\(/,
  /process\.env\b(?!.*safeParse)/,
];

function getStagedFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
      .trim().split('\n')
      .filter(f => /\.(ts|tsx)$/.test(f) && !f.includes('test') && !f.includes('spec') && fs.existsSync(f));
  } catch { return []; }
}

const files = getStagedFiles();
const violations = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const hasZod = content.includes('from \'zod\'') || content.includes('from "zod"');
  const hasSafeParse = content.includes('.safeParse') || content.includes('.parse(');

  for (const pattern of BOUNDARY_PATTERNS) {
    if (pattern.test(content) && !hasZod && !hasSafeParse) {
      violations.push(`  ${file}: boundary data accessed without Zod validation`);
      break;
    }
  }
}

if (violations.length > 0) {
  console.error('✗ Schema Validation Gate:');
  violations.forEach(v => console.error(v));
  process.exit(1);
}

console.log('✓ Schema boundaries: all boundary files use Zod validation');
process.exit(0);
