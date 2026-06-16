/**
 * E2E Test Time Mock
 * 
 * This preload script mocks the global Date constructor to return a fixed timestamp
 * for predictable e2e test results. Only loaded when running e2e tests via --import flag.
 * 
 * Fixed time: Friday 2026-06-11 at 11:30 UTC
 * - Friday has 27 meetings (busiest day in fixture)
 * - Hour 11 UTC has 15 meetings (peak hour)
 * - Ensures consistent, non-empty query results
 */

const FIXED_TIME = process.env.FIXED_TIME || "2026-06-11T11:30:00.000Z"
const fixedDate = new Date(FIXED_TIME)
const fixedTimestamp = fixedDate.getTime()

// Store the original Date constructor
const OriginalDate = Date

// Create a mock Date class
class MockDate extends OriginalDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(fixedTimestamp);
    } else {
      super(...(args as [any]));
    }
  }

  static now(): number {
    return fixedTimestamp;
  }
}

// Replace global Date with mock
(globalThis as any).Date = MockDate;

console.log(`🕐 Fixed time enabled: ${FIXED_TIME}`);
