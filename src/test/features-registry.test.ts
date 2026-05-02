import { describe, expect, it } from 'vitest';

import {
  getAllFeatures,
  getDefaultFeatureIds,
  getFeature,
  getSupportedFeatures,
  isFeatureSupportedForMode,
  sanitizeFeatureIds,
} from '@/src/lib/features/registry';

describe('feature registry', () => {
  const expectedOrder = [
    'tasks',
    'calendar',
    'wishlist',
    'memories',
    'journal',
    'checkins',
    'recurring',
    'timetable',
    'vision',
    'goals',
  ];

  it('exposes the canonical feature ids in stable display order', () => {
    const features = getAllFeatures();

    expect(features.map((feature) => feature.id)).toEqual(expectedOrder);
    expect(getFeature('tasks')).toMatchObject({
      id: 'tasks',
      label: 'Tasks',
      icon: 'checkSquare',
    });
    expect(getFeature('unknown')).toBeUndefined();
  });

  it('returns mode defaults in registry order', () => {
    expect(getDefaultFeatureIds('solo')).toEqual(['tasks', 'calendar', 'journal', 'goals']);
    expect(getDefaultFeatureIds('pair')).toEqual([
      'tasks',
      'calendar',
      'wishlist',
      'memories',
      'journal',
      'checkins',
      'recurring',
    ]);
    expect(getDefaultFeatureIds('crew')).toEqual([
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

  it('filters supported features by mode', () => {
    expect(getSupportedFeatures('crew').map((feature) => feature.id)).toEqual([
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

  it('reports individual mode support', () => {
    expect(isFeatureSupportedForMode('journal', 'solo')).toBe(true);
    expect(isFeatureSupportedForMode('journal', 'pair')).toBe(true);
    expect(isFeatureSupportedForMode('journal', 'crew')).toBe(false);
    expect(isFeatureSupportedForMode('checkins', 'crew')).toBe(false);
    expect(isFeatureSupportedForMode('unknown', 'pair')).toBe(false);
  });

  it('sanitizes ids by dropping unknown, unsupported, and duplicates in registry order', () => {
    expect(
      sanitizeFeatureIds(
        ['vision', 'journal', 'tasks', 'tasks', 'unknown', 'calendar', 'checkins', 'vision'],
        'crew',
      ),
    ).toEqual(['tasks', 'calendar', 'vision']);
  });
});
