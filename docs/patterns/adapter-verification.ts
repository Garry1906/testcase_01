/**
 * PATTERN: Adapter Verification Test
 *
 * Location: tests/integration/adapters/*.integration.test.ts
 * When: Testing thin I/O wrappers (git, filesystem, HTTP)
 * Key: Uses REAL I/O in temp directories — validates the adapter contract
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileAdapter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should read file contents from real filesystem', async () => {
    // ARRANGE: Create real file
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(filePath, 'const x = 1;');

    // ACT: Use the adapter (real I/O)
    const adapter = new FileAdapter();
    const content = await adapter.readFile(filePath);

    // ASSERT: Verify real result
    expect(content).toBe('const x = 1;');
  });

  it('should handle missing files gracefully', async () => {
    const adapter = new FileAdapter();
    await expect(adapter.readFile('/nonexistent')).rejects.toThrow();
  });
});
