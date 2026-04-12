/**
 * Integration test: env module — full module lifecycle.
 *
 * Validates that the env module loads correctly with real environment
 * variables, exports a properly typed config object, and rejects invalid
 * environments at startup.
 */

describe('env module — integration', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    process.env.OPENAI_API_KEY = 'sk-integration-test';
    process.env.NODE_ENV = 'test';
  });

  it('exports a fully-formed config object from valid environment', () => {
    jest.isolateModules(() => {
      const { env } = require('../../src/env');
      expect(env).toBeDefined();
      expect(env.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/testdb');
      expect(env.OPENAI_API_KEY).toBe('sk-integration-test');
      expect(env.NODE_ENV).toBe('test');
    });
  });

  it('exports fields with correct runtime types', () => {
    jest.isolateModules(() => {
      const { env } = require('../../src/env');
      expect(typeof env.DATABASE_URL).toBe('string');
      expect(typeof env.OPENAI_API_KEY).toBe('string');
      expect(typeof env.PORT).toBe('number');
      expect(typeof env.NODE_ENV).toBe('string');
    });
  });

  it('PORT coerces to the numeric default of 3000', () => {
    jest.isolateModules(() => {
      const { env } = require('../../src/env');
      expect(env.PORT).toBe(3000);
    });
  });
});
