import { describe, expect, it } from 'vitest';

import {
  getAllFeatures,
  getDefaultFeatureIds,
  getFeature,
  getSupportedFeatures,
  isFeatureSupportedForMode,
  sanitizeFeatureIds,
} from '@/src/lib/features/registry';

describe('memoryFeed feature', () => {
  it('is registered', () => {
    expect(getFeature('memoryFeed')).toMatchObject({
      id: 'memoryFeed',
      label: 'Memory Feed',
      icon: 'heart',
      supportedModes: ['solo', 'pair', 'crew'],
    });
  });

  it('is supported in solo, pair, and crew modes', () => {
    expect(isFeatureSupportedForMode('memoryFeed', 'solo')).toBe(true);
    expect(isFeatureSupportedForMode('memoryFeed', 'pair')).toBe(true);
    expect(isFeatureSupportedForMode('memoryFeed', 'crew')).toBe(true);
  });

  it('is ON by default in every supported mode', () => {
    const feature = getFeature('memoryFeed');
    expect(feature?.defaultForSolo).toBe(true);
    expect(feature?.defaultForPair).toBe(true);
    expect(feature?.defaultForCrew).toBe(true);
  });

  it('is the only memory-related feature id', () => {
    expect(getFeature('memoryFeed')).toBeDefined();
    expect(getAllFeatures().filter(f => f.id === 'memoryFeed')).toHaveLength(1);
    expect(getFeature('memories')).toBeUndefined();
  });
});

describe('feature registry', () => {
  const expectedOrder = [
    'tasks',
    'calendar',
    'memoryFeed',
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
    expect(getDefaultFeatureIds('solo')).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
    expect(getDefaultFeatureIds('pair')).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
    expect(getDefaultFeatureIds('crew')).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
      'recurring',
      'timetable',
      'goals',
    ]);
  });

  it('filters supported features by mode', () => {
    expect(getSupportedFeatures('crew').map((feature) => feature.id)).toEqual([
      'tasks',
      'calendar',
      'memoryFeed',
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
      'memoryFeed',
      'journal',
      'checkins',
      'recurring',
      'timetable',
      'goals',
    ]);
  });
});
