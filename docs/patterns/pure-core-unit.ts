/**
 * PATTERN: Pure Core Unit Test
 *
 * Location: tests/unit/{path}/*.test.ts
 * When: Code has NO I/O, NO vscode imports, NO side effects
 * Rule: If it imports vscode, it's NOT a unit test — move to integration
 * Rule: If Mock Tax > 2.0x (test LOC > 2x source LOC), delete and write integration test
 */

// NO vscode import — this is pure logic testing
import { MyPureFunction } from '../../src/services/MyService';

describe('MyPureFunction', () => {
  it('returns correct result for valid input', () => {
    // ARRANGE: Plain data, no mocks needed
    const input = { value: 42, threshold: 100 };

    // ACT: Call the pure function
    const result = MyPureFunction(input);

    // ASSERT: Verify output
    expect(result).toEqual({ status: 'below-threshold', delta: 58 });
  });

  it('handles edge case: exactly at threshold', () => {
    const input = { value: 100, threshold: 100 };
    const result = MyPureFunction(input);
    expect(result).toEqual({ status: 'at-threshold', delta: 0 });
  });

  it('handles edge case: empty input', () => {
    expect(() => MyPureFunction(null as any)).toThrow('Input required');
  });
});
