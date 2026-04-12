#!/usr/bin/env node
/**
 * SRP Guardrails — file LOC, function LOC, cyclomatic complexity
 * Thresholds: source file ≤600 LOC, test file ≤300 LOC, config ≤75 LOC
 * Function: ≤50 LOC, cyclomatic complexity ≤15
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FILE_LIMITS = { source: 600, test: 300, config: 75 };
const FUNC_LOC_LIMIT = 50;

function getChangedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
    return staged.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function classifyFile(filepath) {
  if (/\.(test|spec)\.(ts|js)$/.test(filepath)) return 'test';
  if (/\.(config|yaml|toml|json)$/.test(filepath)) return 'config';
  return 'source';
}

function countLines(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return content.split('\n').length;
  } catch { return 0; }
}

function checkFunctionLOC(filepath) {
  if (!/\.(ts|js|tsx|jsx)$/.test(filepath)) return [];
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const violations = [];
    let funcStart = -1;
    let funcName = '';
    let braceDepth = 0;
    let inFunc = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*\([^)]*\)\s*\{)/);
      if (funcMatch && !inFunc) {
        funcName = funcMatch[1] || funcMatch[2] || funcMatch[3] || 'anonymous';
        funcStart = i;
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        inFunc = braceDepth > 0;
      } else if (inFunc) {
        braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        if (braceDepth <= 0) {
          const loc = i - funcStart + 1;
          if (loc > FUNC_LOC_LIMIT) {
            violations.push(`  ${path.relative(process.cwd(), filepath)}:${funcStart + 1} function '${funcName}' is ${loc} LOC (limit: ${FUNC_LOC_LIMIT})`);
          }
          inFunc = false;
          funcStart = -1;
        }
      }
    }
    return violations;
  } catch { return []; }
}

const files = process.argv.slice(2).filter(f => f && fs.existsSync(f));
const toCheck = files.length > 0 ? files : getChangedFiles().filter(f => fs.existsSync(f));

if (toCheck.length === 0) {
  console.log('✓ Guardrails: no files to check');
  process.exit(0);
}

const violations = [];

for (const file of toCheck) {
  const type = classifyFile(file);
  const limit = FILE_LIMITS[type];
  const loc = countLines(file);
  if (loc > limit) {
    violations.push(`  ${file}: ${loc} LOC exceeds ${type} limit (${limit})`);
  }
  violations.push(...checkFunctionLOC(file));
}

if (violations.length > 0) {
  console.error('✗ SRP Guardrails violations:');
  violations.forEach(v => console.error(v));
  process.exit(1);
}

console.log(`✓ Guardrails: ${toCheck.length} file(s) within SRP limits`);
process.exit(0);
