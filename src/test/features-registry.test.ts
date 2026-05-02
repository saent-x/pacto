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
    ).toEqual(['tasks', 'calendar']);
  });

  it('keeps registry reads stable when returned entries are mutated', () => {
    const [tasks] = getAllFeatures();
    const calendar = getFeature('calendar');
    const pairFeatures = getSupportedFeatures('pair');

    try {
      (tasks as any).label = 'Corrupted tasks';
    } catch {
      // Frozen entries may throw in strict mode.
    }
    try {
      (calendar as any).supportedModes.push('crew');
      (calendar as any).supportedModes.splice(0);
    } catch {
      // Frozen nested arrays may throw in strict mode.
    }
    try {
      (pairFeatures[0] as any).id = 'corrupted';
    } catch {
      // Defensive copies may still be frozen.
    }

    expect(getAllFeatures().map((feature) => feature.id)).toEqual(expectedOrder);
    expect(getFeature('tasks')?.label).toBe('Tasks');
    expect(getFeature('calendar')?.supportedModes).toEqual(['solo', 'pair', 'crew']);
    expect(getSupportedFeatures('pair').map((feature) => feature.id)).toEqual([
      'tasks',
      'calendar',
      'wishlist',
      'memories',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
  });
});
