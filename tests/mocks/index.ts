/**
 * Shared Mock Infrastructure (Gold Standard v1.0)
 *
 * RULES:
 * 1. This is the SINGLE SOURCE OF TRUTH for shared mocks
 * 2. NEVER use inline jest.mock() factories — import from here instead
 * 3. Add new capabilities here, not in individual test files
 * 4. Patch mock state in beforeEach, not in the factory
 */

// --- Environment Mock ---

/**
 * Creates a mock env object for tests that need the parsed environment config.
 * Usage: const mockEnv = createMockEnv({ DATABASE_URL: 'postgresql://...' });
 */
export function createMockEnv(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    NODE_ENV: 'test' as const,
    PORT: 3000,
    HOST: 'localhost',
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    OPENAI_API_KEY: 'sk-test-key',
    ...overrides,
  };
}

// --- Process Mock Helpers ---

/**
 * Mocks process.exit to throw instead of exiting, enabling assertions.
 * Usage: const exitSpy = mockProcessExit(); ... expect(exitSpy).toHaveBeenCalledWith(1);
 */
export function mockProcessExit() {
  return jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code ?? ''}) called`);
  });
}
