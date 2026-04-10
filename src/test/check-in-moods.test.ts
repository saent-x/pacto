import { describe, expect, it } from 'vitest';

import { getCheckInMoodMeta, normalizeCheckInMood } from '@/src/constants/checkInMoods';

describe('check-in mood mapping', () => {
  it('normalizes stored emoji values to canonical mood ids', () => {
    expect(normalizeCheckInMood('😫')).toBe('struggling');
    expect(normalizeCheckInMood('😊')).toBe('happy');
    expect(normalizeCheckInMood('🤩')).toBe('amazing');
  });

  it('returns icon metadata for legacy values and canonical ids', () => {
    expect(getCheckInMoodMeta('🙂')).toMatchObject({
      id: 'good',
      icon: 'sun',
      label: 'Good',
    });
    expect(getCheckInMoodMeta('loved')).toMatchObject({
      id: 'loved',
      icon: 'heart',
      label: 'Loved',
    });
  });

  it('returns null for unknown values', () => {
    expect(normalizeCheckInMood('unknown')).toBeNull();
    expect(getCheckInMoodMeta('unknown')).toBeNull();
  });
});
