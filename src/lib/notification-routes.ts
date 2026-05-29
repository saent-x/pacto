import { safeInstantId } from './instant-id';

const SAFE_NOTIFICATION_ROUTES = new Set([
  '/notifications',
  '/(tabs)/home',
  '/(tabs)/calendar',
  '/(tabs)/us',
  '/(tabs)/us/checkins',
  '/(tabs)/us/journal',
  '/(tabs)/us/plans',
  '/(tabs)/us/reminders',
  '/(tabs)/us/tasks',
  '/(tabs)/us/timetables',
  '/(tabs)/memories',
]);

const SAFE_DYNAMIC_NOTIFICATION_ROUTE_PREFIXES = [
  '/(tabs)/memories/',
  '/(tabs)/us/tasks/',
  '/(tabs)/us/timetables/',
] as const;

export function safeNotificationRoute(route: unknown): string | null {
  if (typeof route !== 'string') return null;
  if (route.length === 0 || route !== route.trim()) return null;
  if (/[\u0000-\u001F\u007F]/.test(route)) return null;
  if (route.startsWith('//') || route.includes('\\')) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(route)) return null;
  if (SAFE_NOTIFICATION_ROUTES.has(route)) return route;
  for (const prefix of SAFE_DYNAMIC_NOTIFICATION_ROUTE_PREFIXES) {
    if (!route.startsWith(prefix)) continue;
    const id = route.slice(prefix.length);
    return safeInstantId(id) ? route : null;
  }
  return null;
}
