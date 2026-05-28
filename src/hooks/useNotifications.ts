import { useCallback, useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { pastels } from '@/src/lib/tokens';
import type { IconName } from '@/src/components/ui/Icon';
import { useSession } from './useSession';
import { childRowMatchesParentSpace, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';

export type NotificationKind =
  | 'checkIn'
  | 'reminder'
  | 'timetable'
  | 'memory';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  createdAt: number;
  time: string;
  unread: boolean;
  route?: string;
};

export type BucketLabel = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

export type NotificationBucket = {
  label: BucketLabel;
  items: NotificationItem[];
};

const DAY_MS = 86_400_000;
const NOTIFICATION_SOURCE_LIMIT = 100;

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    if (!hasValidDatePrefix(value)) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}

function hasValidDatePrefix(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function notificationTimestamp(value: unknown): number {
  return timestampMs(value) ?? 0;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketOf(createdAt: number, now: number): BucketLabel {
  const today = startOfDay(now);
  const yesterday = today - DAY_MS;
  const weekFloor = today - 6 * DAY_MS;
  if (createdAt >= today) return 'Today';
  if (createdAt >= yesterday) return 'Yesterday';
  if (createdAt >= weekFloor) return 'This week';
  return 'Earlier';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatTime(createdAtValue: unknown, nowValue: unknown): string {
  const createdAt = timestampMs(createdAtValue);
  const now = timestampMs(nowValue) ?? Date.now();
  if (createdAt == null) return 'Unknown';
  const b = bucketOf(createdAt, now);
  if (b === 'Today') {
    const d = new Date(createdAt);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  if (b === 'Yesterday') {
    const hoursAgo = Math.max(1, Math.round((now - createdAt) / 3_600_000));
    return `${hoursAgo}h`;
  }
  if (b === 'This week') {
    return WEEKDAYS[new Date(createdAt).getDay()];
  }
  const d = new Date(createdAt);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function dueTimeLabel(dueAt: unknown): string {
  const timestamp = timestampMs(dueAt);
  if (timestamp == null) return 'Due date missing';
  const due = new Date(timestamp);
  const h = due.getHours();
  const m = due.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `Due ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const BUCKET_ORDER: BucketLabel[] = ['Today', 'Yesterday', 'This week', 'Earlier'];

type QueryShape = {
  checkIns: Array<{
    id: string;
    mood?: string;
    isPrivate?: boolean;
    createdAt: number;
    author?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
    couple?: Array<{ id: string }> | { id: string };
  }>;
  reminders: Array<{
    id: string;
    title: string;
    dueAt: number;
    createdAt: number;
    isCompleted?: boolean;
    couple?: Array<{ id: string }> | { id: string };
    createdBy?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
  }>;
  timetableItems: Array<{
    id: string;
    title: string;
    createdAt: number;
    couple?: Array<{ id: string }> | { id: string };
    timetable?: Array<{
      id: string;
      couple?: Array<{ id: string }> | { id: string };
      createdBy?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
    }> | {
      id: string;
      couple?: Array<{ id: string }> | { id: string };
      createdBy?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
    };
  }>;
  memories: Array<{
    id: string;
    body?: string;
    kind?: string;
    isPrivate?: boolean;
    notifyMembers?: boolean;
    createdAt: number;
    author?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
    space?: Array<{ id: string }> | { id: string };
  }>;
};

function firstRel<T>(rel: Array<T> | T | undefined): T | undefined {
  if (!rel) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

function isExplicitPartnerPersonalRow(
  spaceId: string | null | undefined,
  ownerId: string | null | undefined,
  personalSpaceId: string | null | undefined,
  userId: string | null | undefined,
) {
  return Boolean(personalSpaceId && spaceId === personalSpaceId && ownerId && ownerId !== userId);
}

function privateFromOwningSpace(
  value: unknown,
  spaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
) {
  return value === true || Boolean(personalSpaceId && spaceId === personalSpaceId);
}

export function useNotifications() {
  const {
    activeCouple,
    membership,
    soloMembership,
    sharedMembership,
    user,
    partner,
    personalSpaceId,
    sharedSpaceId,
  } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId ?? coupleId, sharedSpaceId ?? coupleId]);
  const membershipId = membership?.id ?? null;
  const lastReadAt = membership?.lastNotificationsReadAt ?? 0;
  const personalReadAt = soloMembership?.lastNotificationsReadAt ?? lastReadAt;
  const sharedReadAt = sharedMembership?.lastNotificationsReadAt ?? lastReadAt;
  const partnerName = partner?.displayName ?? 'Partner';
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading, error } = db.useQuery(
    readableSpaceIds.length > 0
      ? {
          checkIns: {
            $: {
              where: relationWhere('couple', readableSpaceIds),
              order: { createdAt: 'desc' as const },
              limit: NOTIFICATION_SOURCE_LIMIT,
            },
            author: {},
            couple: {},
          },
          reminders: {
            $: {
              where: relationWhere('couple', readableSpaceIds),
              order: { createdAt: 'desc' as const },
              limit: NOTIFICATION_SOURCE_LIMIT,
            },
            couple: {},
            createdBy: {},
          },
          timetableItems: {
            $: {
              where: relationWhere('couple', readableSpaceIds),
              order: { createdAt: 'desc' as const },
              limit: NOTIFICATION_SOURCE_LIMIT,
            },
            couple: {},
            timetable: { couple: {}, createdBy: {} },
          },
          memories: {
            $: {
              where: relationWhere('space', readableSpaceIds),
              order: { createdAt: 'desc' as const },
              limit: NOTIFICATION_SOURCE_LIMIT,
            },
            author: {},
            space: {},
          },
        }
      : null,
  );

  const items = useMemo<NotificationItem[]>(() => {
    if (!data) return [];
    const now = Date.now();
    const q = data as Partial<QueryShape>;
    const out: NotificationItem[] = [];
    const readAtForSpace = (spaceId: string | null | undefined) => {
      if (spaceId && spaceId === personalSpaceId) return personalReadAt ?? 0;
      if (spaceId && spaceId === sharedSpaceId) return sharedReadAt ?? 0;
      return lastReadAt;
    };

    for (const c of q.checkIns ?? []) {
      const author = firstRel(c.author);
      const spaceId = firstRel(c.couple)?.id;
      const fromPartner = author?.id && author.id !== userId;
      if (privateFromOwningSpace(c.isPrivate, spaceId, personalSpaceId) && fromPartner) continue;
      const mood = c.mood ? ` · ${c.mood}` : '';
      const createdAt = notificationTimestamp(c.createdAt);
      out.push({
        id: `checkIn:${c.id}`,
        kind: 'checkIn',
        icon: 'sun',
        color: pastels.butter,
        title: `Check-in${mood}`,
        sub: fromPartner
          ? `${author?.displayName ?? partnerName} just checked in`
          : 'You checked in',
        createdAt,
        time: formatTime(c.createdAt, now),
        unread: createdAt > readAtForSpace(spaceId),
        route: '/(tabs)/us/checkins',
      });
    }

    for (const r of q.reminders ?? []) {
      if (r.isCompleted) continue;
      const spaceId = firstRel(r.couple)?.id;
      const creatorId = firstRel(r.createdBy)?.id;
      if (isExplicitPartnerPersonalRow(spaceId, creatorId, personalSpaceId, userId)) continue;
      const createdAt = notificationTimestamp(r.createdAt);
      out.push({
        id: `reminder:${r.id}`,
        kind: 'reminder',
        icon: 'bell',
        color: pastels.lavender,
        title: `Reminder · ${r.title}`,
        sub: dueTimeLabel(r.dueAt),
        createdAt,
        time: formatTime(r.createdAt, now),
        unread: createdAt > readAtForSpace(spaceId),
        route: '/(tabs)/us/reminders',
      });
    }

    for (const t of (q.timetableItems ?? []).filter((item) =>
      childRowMatchesParentSpace(item, 'timetable'),
    )) {
      const timetable = firstRel(t.timetable);
      const spaceId = firstRel(t.couple)?.id ?? firstRel(timetable?.couple)?.id;
      const timetableCreatorId = firstRel(timetable?.createdBy)?.id;
      if (isExplicitPartnerPersonalRow(spaceId, timetableCreatorId, personalSpaceId, userId)) continue;
      const createdAt = notificationTimestamp(t.createdAt);
      out.push({
        id: `timetable:${t.id}`,
        kind: 'timetable',
        icon: 'calendar',
        color: pastels.peach,
        title: 'Timetable updated',
        sub: `${t.title} added`,
        createdAt,
        time: formatTime(t.createdAt, now),
        unread: createdAt > readAtForSpace(spaceId),
        route: '/(tabs)/us/timetables',
      });
    }

    for (const m of q.memories ?? []) {
      const author = firstRel(m.author);
      const spaceId = firstRel(m.space)?.id;
      const fromPartner = author?.id && author.id !== userId;
      if (privateFromOwningSpace(m.isPrivate, spaceId, personalSpaceId) && fromPartner) continue;
      if (fromPartner && m.notifyMembers === false) continue;
      const preview = m.body?.trim();
      const createdAt = notificationTimestamp(m.createdAt);
      out.push({
        id: `memory:${m.id}`,
        kind: 'memory',
        icon: 'heart',
        color: pastels.rose,
        title: m.kind === 'reply'
          ? 'Memory reply'
          : fromPartner
          ? `${author?.displayName ?? partnerName} added a memory`
          : 'Memory posted',
        sub: preview ? preview.slice(0, 90) : 'Open memory',
        createdAt,
        time: formatTime(m.createdAt, now),
        unread: createdAt > readAtForSpace(spaceId),
        route: `/(tabs)/memories/${m.id}`,
      });
    }

    out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [data, lastReadAt, partnerName, personalReadAt, personalSpaceId, sharedReadAt, sharedSpaceId, userId]);

  const buckets = useMemo<NotificationBucket[]>(() => {
    const now = Date.now();
    const map = new Map<BucketLabel, NotificationItem[]>();
    for (const item of items) {
      const b = bucketOf(item.createdAt, now);
      const arr = map.get(b) ?? [];
      arr.push(item);
      map.set(b, arr);
    }
    return BUCKET_ORDER
      .filter((label) => (map.get(label)?.length ?? 0) > 0)
      .map((label) => ({ label, items: map.get(label)! }));
  }, [items]);

  const unreadCount = useMemo(
    () => items.reduce((acc, it) => acc + (it.unread ? 1 : 0), 0),
    [items],
  );

  const markAllRead = useCallback(async () => {
    const ids = uniqueSpaceIds([
      soloMembership?.id,
      sharedMembership?.id,
      membershipId,
    ]);
    if (ids.length === 0) return;
    const readAt = Date.now();
    try {
      await db.transact(
        ids.map((id) =>
          db.tx.memberships[id].update({
            lastNotificationsReadAt: readAt,
          }),
        ),
      );
    } catch (err) {
      console.warn('[useNotifications] markAllRead failed:', err);
    }
  }, [membershipId, sharedMembership?.id, soloMembership?.id]);

  return {
    buckets,
    unreadCount,
    isLoading: readableSpaceIds.length > 0 && queryLoading,
    error,
    markAllRead,
  };
}
