#!/usr/bin/env node
/**
 * Supply Chain Gate — detect AI-hallucinated npm packages
 * Checks that all packages in package.json exist in the npm registry.
 */

const fs = require('fs');
const { execSync } = require('child_process');

function getPackages() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
}

function checkPackage(name) {
  try {
    execSync(`npm view ${name} version`, { stdio: 'pipe', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

// Only run when package.json is staged
const stagedFiles = (() => {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n');
  } catch { return []; }
})();

if (!stagedFiles.includes('package.json') && !process.argv.includes('--all')) {
  console.log('✓ Supply chain: package.json unchanged — skip');
  process.exit(0);
}

const packages = getPackages();
const hallucinated = [];

for (const pkg of packages) {
  if (!checkPackage(pkg)) {
    hallucinated.push(pkg);
  }
}

if (hallucinated.length > 0) {
  console.error('✗ Hallucinated packages detected (not in npm registry):');
  hallucinated.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

console.log(`✓ Supply chain: all ${packages.length} packages verified`);
process.exit(0);
