import { describe, expect, it } from 'vitest';

import {
  matchesSelectedDate,
  matchesSelectedDateForTimestamp,
} from '@/src/lib/togetherDateFilter';

describe('togetherDateFilter', () => {
  it('matches all items when no date is selected', () => {
    expect(matchesSelectedDate('2026-04-11', null)).toBe(true);
    expect(matchesSelectedDate(null, null)).toBe(true);
  });

  it('matches string-backed dates exactly', () => {
    expect(matchesSelectedDate('2026-04-11', '2026-04-11')).toBe(true);
    expect(matchesSelectedDate('2026-04-10', '2026-04-11')).toBe(false);
    expect(matchesSelectedDate(null, '2026-04-11')).toBe(false);
  });

  it('converts timestamps into local date keys before matching', () => {
    const timestamp = new Date('2026-04-11T14:30:00').getTime();

    expect(matchesSelectedDateForTimestamp(timestamp, '2026-04-11')).toBe(true);
    expect(matchesSelectedDateForTimestamp(timestamp, '2026-04-12')).toBe(false);
    expect(matchesSelectedDateForTimestamp(timestamp, null)).toBe(true);
  });
});
