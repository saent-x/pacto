import { useMemo } from 'react';
import {
  type FeatureEntry,
  type FeatureId,
  getFeature,
  isFeatureSupportedForMode,
} from '@/src/lib/features/registry';
import { useSession } from '@/src/hooks/useSession';

const ROUTE_FEATURES: readonly [string, FeatureId][] = [
  ['/(tabs)/us/tasks', 'tasks'],
  ['/sheets/new-task', 'tasks'],
  ['/sheets/new-list', 'tasks'],
  ['/(tabs)/calendar', 'calendar'],
  ['/(tabs)/us/reminders', 'recurring'],
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
];

const US_MODULE_FEATURES = {
  memories: 'memories',
  notes: 'memories',
  milestones: 'memories',
  goals: 'goals',
  plans: 'goals',
  wishlist: 'wishlist',
  wishlists: 'wishlist',
  journal: 'journal',
  checkins: 'checkins',
  timetable: 'timetable',
  timetables: 'timetable',
} as const satisfies Record<string, FeatureId>;

type FeatureGate = {
  enabled: boolean;
  feature: FeatureEntry | undefined;
};

type RouteFeatureGate = {
  featureId: FeatureId | null;
  feature: FeatureEntry | undefined;
  enabled: boolean;
};

export function routeFeatureForPath(path: string): FeatureId | null {
  const normalized = normalizeRouteGroups(normalizePath(path));
  const match = ROUTE_FEATURES.find(([route]) =>
    isRouteMatch(normalized, normalizeRouteGroups(route)),
  );
  return match?.[1] ?? null;
}

export function featureForUsModule(moduleId: string): FeatureId | null {
  return US_MODULE_FEATURES[moduleId as keyof typeof US_MODULE_FEATURES] ?? null;
}

export function useFeatureGate(featureId: FeatureId): FeatureGate {
  const session = useSession();
  const feature = useMemo(() => getFeature(featureId), [featureId]);
  const supported = isFeatureSupportedForMode(featureId, session.mode);

  return {
    enabled: supported && session.isFeatureEnabled(featureId),
    feature,
  };
}

export function useRouteFeatureGate(path: string): RouteFeatureGate {
  const session = useSession();
  const featureId = routeFeatureForPath(path);
  const feature = useMemo(() => (featureId ? getFeature(featureId) : undefined), [featureId]);

  return {
    featureId,
    feature,
    enabled:
      featureId === null
        ? true
        : isFeatureSupportedForMode(featureId, session.mode) && session.isFeatureEnabled(featureId),
  };
}

function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? '';
  return clean === '' ? '/' : clean;
}

function normalizeRouteGroups(path: string): string {
  const normalized = path.replace(/\/\([^/]+\)/g, '');
  return normalized === '' ? '/' : normalized;
}

function isRouteMatch(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`);
}
