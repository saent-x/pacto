import { describe, expect, it, vi } from 'vitest';
import {
  featureForUsModule,
  routeFeatureForPath,
} from '@/src/hooks/useFeatureGate';
import type { FeatureId } from '@/src/lib/features/registry';

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    mode: 'pair',
    isFeatureEnabled: () => true,
  }),
}));

describe('feature gate mapping helpers', () => {
  it.each<[string, FeatureId | null]>([
    ['/(tabs)/tasks', 'tasks'],
    ['/sheets/new-task', 'tasks'],
    ['/sheets/new-list', 'tasks'],
    ['/(tabs)/calendar', 'calendar'],
    ['/(tabs)/reminders', 'recurring'],
    ['/sheets/new-reminder', 'recurring'],
    ['/(tabs)/us/wishlists', 'wishlist'],
    ['/sheets/new-wish', 'wishlist'],
    ['/(tabs)/us/journal', 'journal'],
    ['/sheets/new-entry', 'journal'],
    ['/sheets/journal-entry', 'journal'],
    ['/(tabs)/us/checkins', 'checkins'],
    ['/sheets/new-checkin', 'checkins'],
    ['/(tabs)/us/notes', 'memories'],
    ['/sheets/new-note', 'memories'],
    ['/(tabs)/us/milestones', 'memories'],
    ['/sheets/new-milestone', 'memories'],
    ['/(tabs)/us/timetables', 'timetable'],
    ['/sheets/new-timetable', 'timetable'],
    ['/sheets/new-timetable-item', 'timetable'],
    ['/(tabs)/us/plans', 'goals'],
    ['/sheets/new-plan', 'goals'],
    ['/sheets/profile', null],
    ['/unknown', null],
  ])('maps route %s to %s', (path, featureId) => {
    expect(routeFeatureForPath(path)).toBe(featureId);
  });

  it.each<[string, FeatureId | null]>([
    ['notes', 'memories'],
    ['milestones', 'memories'],
    ['plans', 'goals'],
    ['wishlists', 'wishlist'],
    ['journal', 'journal'],
    ['checkins', 'checkins'],
    ['timetables', 'timetable'],
    ['expenses', null],
    ['unknown', null],
  ])('maps Us module %s to %s', (moduleId, featureId) => {
    expect(featureForUsModule(moduleId)).toBe(featureId);
  });
});
