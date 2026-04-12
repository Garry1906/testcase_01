/**
 * PATTERN: Gold Standard Integration Test (v3.0)
 *
 * Location: tests/integration/{area}/*.test.ts
 * When: Code uses external APIs, or Mock Tax on unit test exceeds 2.0x
 * Rules:
 *   1. Uses shared mock (tests/mocks/index.ts) — NEVER inline jest.mock() factories
 *   2. Patch capabilities in beforeEach — don't modify the shared mock file
 *   3. jest.resetAllMocks() in beforeEach — clean slate every test
 */

import { createMockEnv } from '../mocks';

describe('MyFeature Integration', () => {
  beforeEach(() => {
    // 1. CLEAN SLATE
    jest.resetAllMocks();
  });

  it('should use validated env config', () => {
    // ARRANGE: Use shared mock factory
    const env = createMockEnv({ DATABASE_URL: 'postgresql://prod:pass@db/app' });

    // ACT
    const result = someFunction(env);

    // ASSERT
    expect(result).toBeDefined();
  });
});
