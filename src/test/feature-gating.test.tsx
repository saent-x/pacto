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
  it.each<[string, FeatureId]>([
    ['/sheets/new-task', 'tasks'],
    ['/sheets/new-list', 'tasks'],
    ['/sheets/new-reminder', 'recurring'],
    ['/sheets/new-wish', 'wishlist'],
    ['/sheets/new-note', 'memories'],
    ['/sheets/new-milestone', 'memories'],
    ['/sheets/new-entry', 'journal'],
    ['/sheets/journal-entry', 'journal'],
    ['/sheets/new-checkin', 'checkins'],
    ['/sheets/new-plan', 'goals'],
    ['/sheets/new-timetable', 'timetable'],
    ['/sheets/new-timetable-item', 'timetable'],
  ])('maps guarded sheet route %s to %s', (path, featureId) => {
    expect(routeFeatureForPath(path)).toBe(featureId);
  });

  it.each<[string, FeatureId | null]>([
    ['/(tabs)/us/tasks', 'tasks'],
    ['/us/tasks', 'tasks'],
    ['/us/tasks/abc', 'tasks'],
    ['/sheets/new-task', 'tasks'],
    ['/sheets/new-list', 'tasks'],
    ['/(tabs)/calendar', 'calendar'],
    ['/calendar', 'calendar'],
    ['/(tabs)/us/reminders', 'recurring'],
    ['/us/reminders', 'recurring'],
    ['/sheets/new-reminder', 'recurring'],
    ['/(tabs)/us/wishlists', 'wishlist'],
    ['/us/wishlists', 'wishlist'],
    ['/sheets/new-wish', 'wishlist'],
    ['/(tabs)/us/journal', 'journal'],
    ['/us/journal', 'journal'],
    ['/sheets/new-entry', 'journal'],
    ['/sheets/journal-entry', 'journal'],
    ['/(tabs)/us/checkins', 'checkins'],
    ['/us/checkins', 'checkins'],
    ['/sheets/new-checkin', 'checkins'],
    ['/(tabs)/us/notes', 'memories'],
    ['/us/notes', 'memories'],
    ['/sheets/new-note', 'memories'],
    ['/(tabs)/us/milestones', 'memories'],
    ['/us/milestones', 'memories'],
    ['/sheets/new-milestone', 'memories'],
    ['/(tabs)/us/timetables', 'timetable'],
    ['/us/timetables', 'timetable'],
    ['/us/timetables/t1', 'timetable'],
    ['/sheets/new-timetable', 'timetable'],
    ['/sheets/new-timetable-item', 'timetable'],
    ['/(tabs)/us/plans', 'goals'],
    ['/us/plans', 'goals'],
    ['/sheets/new-plan', 'goals'],
    ['/sheets/profile', null],
    ['/sheets/profile-features', null],
    ['/unknown', null],
  ])('maps route %s to %s', (path, featureId) => {
    expect(routeFeatureForPath(path)).toBe(featureId);
  });

  it.each<[string, FeatureId | null]>([
    ['memories', 'memories'],
    ['notes', 'memories'],
    ['milestones', 'memories'],
    ['goals', 'goals'],
    ['plans', 'goals'],
    ['wishlist', 'wishlist'],
    ['wishlists', 'wishlist'],
    ['journal', 'journal'],
    ['checkins', 'checkins'],
    ['timetable', 'timetable'],
    ['timetables', 'timetable'],
    ['expenses', null],
    ['unknown', null],
  ])('maps Us module %s to %s', (moduleId, featureId) => {
    expect(featureForUsModule(moduleId)).toBe(featureId);
  });
});
