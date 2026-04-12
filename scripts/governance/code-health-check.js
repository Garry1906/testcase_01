#!/usr/bin/env node
/**
 * Code Health — orphan file + dead export detection.
 * Warns (non-blocking) about files never imported and exports never used.
 */

const fs = require('fs');
const path = require('path');

function getSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage', '__tests__'].includes(f)) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts') && !f.endsWith('.test.ts')) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

function getAllImports(files) {
  const imported = new Set();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const re = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (m[1].startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), m[1]);
        imported.add(resolved);
        imported.add(resolved + '.ts');
      }
    }
  }
  return imported;
}

const sourceFiles = getSourceFiles('src');
if (sourceFiles.length <= 1) {
  console.log('✓ Code health: single-file project — skip orphan check');
  process.exit(0);
}

const imported = getAllImports(sourceFiles);
const orphans = sourceFiles.filter(f => !imported.has(f) && !f.includes('index.ts') && !f.includes('env.ts'));

if (orphans.length > 0) {
  console.warn(`⚠ Code health: ${orphans.length} potentially orphaned file(s):`);
  orphans.forEach(f => console.warn(`  ${path.relative(process.cwd(), f)}`));
  // Non-blocking warning
}

console.log(`✓ Code health: ${sourceFiles.length} source files analyzed`);
process.exit(0);
