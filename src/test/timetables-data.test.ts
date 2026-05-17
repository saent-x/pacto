import { normalizeWho } from '@/src/lib/timetables-data';

describe('timetable data helpers', () => {
  it('normalizes timetable assignment keys and preserves legacy partner rows', () => {
    expect(normalizeWho('me')).toBe('me');
    expect(normalizeWho('partner')).toBe('partner');
    expect(normalizeWho('sofia')).toBe('partner');
    expect(normalizeWho('both')).toBe('both');
    expect(normalizeWho('unknown')).toBe('both');
  });
});
