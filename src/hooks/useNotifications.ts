import { useCallback, useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { pastels } from '@/src/lib/tokens';
import type { IconName } from '@/src/components/ui/Icon';
import { useSession } from './useSession';

export type NotificationKind =
  | 'loveNote'
  | 'checkIn'
  | 'reminder'
  | 'expense'
  | 'milestone'
  | 'timetable';

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
};

export type BucketLabel = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

export type NotificationBucket = {
  label: BucketLabel;
  items: NotificationItem[];
};

const DAY_MS = 86_400_000;

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

export function formatTime(createdAt: number, now: number): string {
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

const BUCKET_ORDER: BucketLabel[] = ['Today', 'Yesterday', 'This week', 'Earlier'];

type QueryShape = {
  loveNotes: Array<{
    id: string;
    body: string;
    createdAt: number;
    author?: Array<{ id: string }> | { id: string };
  }>;
  checkIns: Array<{
    id: string;
    mood?: string;
    createdAt: number;
    author?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
  }>;
  reminders: Array<{
    id: string;
    title: string;
    dueAt: number;
    createdAt: number;
    isCompleted?: boolean;
  }>;
  expenses: Array<{
    id: string;
    title: string;
    amount: number;
    currency?: string;
    category?: string;
    createdAt: number;
    paidBy?: Array<{ id: string; displayName?: string }> | { id: string; displayName?: string };
  }>;
  milestones: Array<{
    id: string;
    title: string;
    date: string;
    createdAt: number;
  }>;
  timetableItems: Array<{
    id: string;
    title: string;
    createdAt: number;
  }>;
};

function firstRel<T>(rel: Array<T> | T | undefined): T | undefined {
  if (!rel) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

export function useNotifications() {
  const { activeCouple, membership, user, partner } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const membershipId = membership?.id ?? null;
  const lastReadAt = membership?.lastNotificationsReadAt ?? 0;
  const partnerName = partner?.displayName ?? 'Partner';
  const userId = user?.id ?? null;

  const { data, isLoading: queryLoading, error } = db.useQuery(
    coupleId
      ? {
          loveNotes: { $: { where: { 'couple.id': coupleId } }, author: {} },
          checkIns: { $: { where: { 'couple.id': coupleId } }, author: {} },
          reminders: { $: { where: { 'couple.id': coupleId } } },
          expenses: { $: { where: { 'couple.id': coupleId } }, paidBy: {} },
          milestones: { $: { where: { 'couple.id': coupleId } } },
          timetableItems: { $: { where: { 'couple.id': coupleId } } },
        }
      : null,
  );

  const now = Date.now();

  const items = useMemo<NotificationItem[]>(() => {
    if (!data) return [];
    const q = data as Partial<QueryShape>;
    const out: NotificationItem[] = [];

    for (const n of q.loveNotes ?? []) {
      const authorId = firstRel(n.author)?.id;
      const fromPartner = authorId && authorId !== userId;
      out.push({
        id: `loveNote:${n.id}`,
        kind: 'loveNote',
        icon: 'heart',
        color: pastels.rose,
        title: fromPartner ? `${partnerName} sent you a note` : 'Note sent',
        sub: fromPartner ? 'Tap to read' : 'Delivered',
        createdAt: n.createdAt,
        time: formatTime(n.createdAt, now),
        unread: n.createdAt > lastReadAt,
      });
    }

    for (const c of q.checkIns ?? []) {
      const author = firstRel(c.author);
      const fromPartner = author?.id && author.id !== userId;
      const mood = c.mood ? ` · ${c.mood}` : '';
      out.push({
        id: `checkIn:${c.id}`,
        kind: 'checkIn',
        icon: 'sun',
        color: pastels.butter,
        title: `Check-in${mood}`,
        sub: fromPartner
          ? `${author?.displayName ?? partnerName} just checked in`
          : 'You checked in',
        createdAt: c.createdAt,
        time: formatTime(c.createdAt, now),
        unread: c.createdAt > lastReadAt,
      });
    }

    for (const r of q.reminders ?? []) {
      if (r.isCompleted) continue;
      const due = new Date(r.dueAt);
      const h = due.getHours();
      const m = due.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = ((h + 11) % 12) + 1;
      out.push({
        id: `reminder:${r.id}`,
        kind: 'reminder',
        icon: 'bell',
        color: pastels.lavender,
        title: `Reminder · ${r.title}`,
        sub: `Due ${h12}:${m.toString().padStart(2, '0')} ${ampm}`,
        createdAt: r.createdAt,
        time: formatTime(r.createdAt, now),
        unread: r.createdAt > lastReadAt,
      });
    }

    for (const e of q.expenses ?? []) {
      const payer = firstRel(e.paidBy);
      const fromPartner = payer?.id && payer.id !== userId;
      const who = fromPartner ? payer?.displayName ?? partnerName : 'You';
      const sym = e.currency === 'USD' ? '$' : '€';
      out.push({
        id: `expense:${e.id}`,
        kind: 'expense',
        icon: 'dollarSign',
        color: pastels.mint,
        title: `${who} added ${sym}${Math.round(e.amount)} expense`,
        sub: e.category ?? e.title,
        createdAt: e.createdAt,
        time: formatTime(e.createdAt, now),
        unread: e.createdAt > lastReadAt,
      });
    }

    for (const ms of q.milestones ?? []) {
      out.push({
        id: `milestone:${ms.id}`,
        kind: 'milestone',
        icon: 'flag',
        color: pastels.peach,
        title: ms.title,
        sub: ms.date,
        createdAt: ms.createdAt,
        time: formatTime(ms.createdAt, now),
        unread: ms.createdAt > lastReadAt,
      });
    }

    for (const t of q.timetableItems ?? []) {
      out.push({
        id: `timetable:${t.id}`,
        kind: 'timetable',
        icon: 'calendar',
        color: pastels.peach,
        title: 'Timetable updated',
        sub: `${t.title} added`,
        createdAt: t.createdAt,
        time: formatTime(t.createdAt, now),
        unread: t.createdAt > lastReadAt,
      });
    }

    out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [data, lastReadAt, now, partnerName, userId]);

  const buckets = useMemo<NotificationBucket[]>(() => {
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
  }, [items, now]);

  const unreadCount = useMemo(
    () => items.reduce((acc, it) => acc + (it.unread ? 1 : 0), 0),
    [items],
  );

  const markAllRead = useCallback(async () => {
    if (!membershipId) return;
    await db.transact(
      db.tx.memberships[membershipId].update({
        lastNotificationsReadAt: Date.now(),
      }),
    );
  }, [membershipId]);

  return {
    buckets,
    unreadCount,
    isLoading: !!coupleId && queryLoading,
    error,
    markAllRead,
  };
}
