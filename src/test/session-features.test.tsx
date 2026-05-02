import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/db', () => ({
  db: {
    useAuth: vi.fn(),
    useQuery: vi.fn(),
  },
}));

import { buildSessionFeatureState } from '@/src/lib/session';

describe('session feature state', () => {
  it('uses mode defaults when stored features are missing', () => {
    expect(buildSessionFeatureState(undefined, 'solo').enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'journal',
      'goals',
    ]);
    expect(buildSessionFeatureState(null, 'pair').enabledFeatures).toEqual([
      'tasks',
      'calendar',
      'wishlist',
      'memories',
      'journal',
      'checkins',
      'recurring',
    ]);
    expect(buildSessionFeatureState(undefined, 'crew').enabledFeatures).toEqual([
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

  it('sanitizes stored arrays by removing unknowns and duplicates in registry order', () => {
    const state = buildSessionFeatureState(
      ['vision', 'tasks', 'unknown', 'tasks', 42, 'calendar', 'wishlist'],
      'crew',
    );

    expect(state.enabledFeatures).toEqual(['tasks', 'calendar', 'wishlist', 'vision']);
  });

  it('excludes stored ids unsupported by the current mode', () => {
    const state = buildSessionFeatureState(
      ['journal', 'checkins', 'tasks', 'calendar', 'recurring'],
      'crew',
    );

    expect(state.enabledFeatures).toEqual(['tasks', 'calendar', 'recurring']);
  });

  it('preserves an explicitly empty stored array', () => {
    const state = buildSessionFeatureState([], 'pair');

    expect(state.enabledFeatures).toEqual([]);
  });

  it('reports whether sanitized features are enabled', () => {
    const state = buildSessionFeatureState(['calendar', 'journal', 'unknown'], 'solo');

    expect(state.isFeatureEnabled('calendar')).toBe(true);
    expect(state.isFeatureEnabled('journal')).toBe(true);
    expect(state.isFeatureEnabled('tasks')).toBe(false);
    expect(state.isFeatureEnabled('wishlist')).toBe(false);
  });
});
