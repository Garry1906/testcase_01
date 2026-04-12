#!/usr/bin/env node
/**
 * Dependency Health — detect circular import cycles in TypeScript source.
 * Uses simple DFS on static import graph.
 */

const fs = require('fs');
const path = require('path');

function buildImportGraph(dir) {
  const graph = {};
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(f)) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        const imports = [];
        const re = /from\s+['"]([^'"]+)['"]/g;
        let m;
        while ((m = re.exec(content)) !== null) {
          const imp = m[1];
          if (imp.startsWith('.')) {
            const resolved = path.resolve(path.dirname(full), imp);
            const candidates = [resolved, resolved + '.ts', resolved + '/index.ts'];
            for (const c of candidates) {
              if (fs.existsSync(c)) {
                imports.push(c);
                break;
              }
            }
          }
        }
        graph[full] = imports;
      }
    }
  }
  walk(dir);
  return graph;
}

function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();

  function dfs(node, path) {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat(node).map(f => path.relative(process.cwd(), f)));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    for (const dep of (graph[node] || [])) {
      dfs(dep, [...path, node]);
    }
    stack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    dfs(node, []);
  }
  return cycles;
}

if (!fs.existsSync('src')) {
  console.log('✓ Circular deps: no src/ directory');
  process.exit(0);
}

const graph = buildImportGraph('src');
const cycles = detectCycles(graph);

if (cycles.length > 0) {
  console.error(`✗ Circular dependencies detected (${cycles.length}):`);
  cycles.forEach(cycle => console.error('  ' + cycle.join(' → ')));
  process.exit(1);
}

console.log(`✓ Circular deps: no cycles found in ${Object.keys(graph).length} modules`);
process.exit(0);
