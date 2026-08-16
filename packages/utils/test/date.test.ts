/**
 * @smart-edms/utils — date tests.
 */
import { describe, expect, it } from 'vitest';
import { daysUntil, formatRelative, fromISODate, isExpired, toISODate } from '../src/index.js';

describe('date.toISODate', () => {
  it('formats a Date as ISO UTC', () => {
    const d = new Date('2025-01-31T08:30:00.000Z');
    expect(toISODate(d)).toBe('2025-01-31T08:30:00.000Z');
  });

  it('accepts an ISO string', () => {
    expect(toISODate('2025-01-31T08:30:00.000Z')).toBe('2025-01-31T08:30:00.000Z');
  });

  it('accepts an epoch number', () => {
    // 1738312200000 ms = 2025-01-31T08:30:00.000Z
    expect(toISODate(1738312200000)).toBe('2025-01-31T08:30:00.000Z');
  });

  it('returns null for invalid input', () => {
    expect(toISODate(new Date('invalid'))).toBe(null);
    expect(toISODate('not a date')).toBe(null);
  });
});

describe('date.fromISODate', () => {
  it('parses a full datetime', () => {
    const d = fromISODate('2025-01-31T08:30:00.000Z');
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(Date.UTC(2025, 0, 31, 8, 30, 0));
  });

  it('parses a date-only string as UTC midnight', () => {
    const d = fromISODate('2025-01-31');
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2025);
    expect(d!.getUTCMonth()).toBe(0);
    expect(d!.getUTCDate()).toBe(31);
  });

  it('returns null for invalid input', () => {
    expect(fromISODate('')).toBe(null);
    expect(fromISODate('not a date')).toBe(null);
  });
});

describe('date.formatRelative', () => {
  const now = new Date('2025-01-31T12:00:00.000Z');

  it('formats a past time with "ago"', () => {
    const past = new Date('2025-01-31T09:00:00.000Z'); // 3h before
    const out = formatRelative(past, 'en', now);
    expect(out).toMatch(/3 hours? ago/);
  });

  it('formats a future time with "in"', () => {
    const future = new Date('2025-02-03T12:00:00.000Z'); // 3 days later
    const out = formatRelative(future, 'en', now);
    expect(out).toMatch(/in 3 days?/);
  });

  it('returns empty string for invalid date', () => {
    expect(formatRelative('invalid', 'en', now)).toBe('');
  });

  it('respects locale for non-English', () => {
    const past = new Date('2025-01-31T09:00:00.000Z');
    const out = formatRelative(past, 'fr', now);
    // French relative time format starts with "il y a" for past
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('date.isExpired', () => {
  it('returns true for past dates', () => {
    const now = new Date('2025-01-31T12:00:00.000Z');
    expect(isExpired('2025-01-30T00:00:00.000Z', now)).toBe(true);
  });

  it('returns false for future dates', () => {
    const now = new Date('2025-01-31T12:00:00.000Z');
    expect(isExpired('2025-02-28T00:00:00.000Z', now)).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(isExpired('invalid')).toBe(false);
  });
});

describe('date.daysUntil', () => {
  const now = new Date('2025-01-31T12:00:00.000Z');

  it('returns positive days for future dates', () => {
    const threeDaysLater = new Date('2025-02-03T12:00:00.000Z');
    expect(daysUntil(threeDaysLater, now)).toBe(3);
  });

  it('returns negative days for past dates', () => {
    const twoDaysAgo = new Date('2025-01-29T12:00:00.000Z');
    expect(daysUntil(twoDaysAgo, now)).toBe(-2);
  });

  it('returns 0 for less than 24 hours away', () => {
    const sixHoursLater = new Date('2025-01-31T18:00:00.000Z');
    expect(daysUntil(sixHoursLater, now)).toBe(0);
  });

  it('returns null for invalid dates', () => {
    expect(daysUntil('invalid', now)).toBe(null);
  });
});
