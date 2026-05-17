import { describe, expect, it } from 'vitest';

import {
  isCreateSpaceInviteEligible,
  resolveCreateSpaceFeatureIds,
  resolveCreateSpaceKind,
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
    ).toEqual(['tasks']);
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

  it('persists crew kind when legacy couple wire kind is paired with crew mode', () => {
    expect(resolveCreateSpaceKind({ kind: 'couple', mode: 'crew' })).toBe('crew');
  });

  it('persists pair kind for legacy couple spaces without an explicit mode', () => {
    expect(resolveCreateSpaceKind({ kind: 'couple' })).toBe('pair');
  });

  it('treats direct crew spaces as invite eligible', () => {
    expect(isCreateSpaceInviteEligible({ kind: 'crew' })).toBe(true);
    expect(isCreateSpaceInviteEligible({ kind: 'crew', mode: 'crew' })).toBe(true);
  });

  it('does not generate invites for solo spaces', () => {
    expect(isCreateSpaceInviteEligible({ kind: 'solo' })).toBe(false);
  });
});
