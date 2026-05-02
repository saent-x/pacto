import { describe, expect, it } from 'vitest';

import {
  resolveCreateSpaceFeatureIds,
  resolveUpgradeSoloToCoupleFeatureIds,
} from '@/src/lib/space-features';

describe('space action feature resolution', () => {
  it('defaults legacy couple spaces to pair features', () => {
    expect(resolveCreateSpaceFeatureIds({ kind: 'couple' })).toEqual([
      'tasks',
      'calendar',
      'wishlist',
      'memories',
      'journal',
      'checkins',
      'recurring',
    ]);
  });

  it('uses an explicit crew mode with legacy couple wire kind', () => {
    expect(resolveCreateSpaceFeatureIds({ kind: 'couple', mode: 'crew' })).toEqual([
      'tasks',
      'calendar',
      'wishlist',
      'memories',
      'recurring',
      'timetable',
      'vision',
      'goals',
    ]);
  });

  it('sanitizes explicit ids by the provided mode', () => {
    expect(
      resolveCreateSpaceFeatureIds({
        kind: 'couple',
        mode: 'crew',
        enabledFeatures: ['journal', 'checkins', 'vision', 'tasks', 'tasks'],
      }),
    ).toEqual(['tasks', 'vision']);
  });

  it('uses pair defaults when upgrading solo to couple', () => {
    expect(resolveUpgradeSoloToCoupleFeatureIds()).toEqual([
      'tasks',
      'calendar',
      'wishlist',
      'memories',
      'journal',
      'checkins',
      'recurring',
    ]);
  });
});
