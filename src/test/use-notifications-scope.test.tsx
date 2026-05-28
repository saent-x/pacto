import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: {
    checkIns: [],
    reminders: [],
    timetableItems: [],
    memories: [],
  } as any,
}));

const sessionState = vi.hoisted(() => ({
  current: {
    activeCouple: { couple: { id: 'shared-1' } },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
    membership: { id: 'shared-membership', lastNotificationsReadAt: 2000 },
    soloMembership: { id: 'solo-membership', lastNotificationsReadAt: 1000 },
    sharedMembership: { id: 'shared-membership', lastNotificationsReadAt: 2000 },
    user: { id: 'user-1', displayName: 'Tor' },
    partner: { id: 'partner-1', displayName: 'Sam' },
  } as any,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
  transact: vi.fn(async (op: any) => op),
  tx: {
    memberships: new Proxy({}, {
      get: (_target, id: string) => ({
        update: vi.fn((payload: any) => ({ table: 'memberships', id, payload })),
      }),
    }),
  },
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState.current),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | null = null;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('useNotifications space scope', () => {
  beforeEach(() => {
    dbMock.useQuery.mockClear();
    dbMock.transact.mockClear();
    queryState.data = {
      checkIns: [],
      reminders: [],
      timetableItems: [],
      memories: [],
    };
    sessionState.current = {
      activeCouple: { couple: { id: 'shared-1' } },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
      membership: { id: 'shared-membership', lastNotificationsReadAt: 2000 },
      soloMembership: { id: 'solo-membership', lastNotificationsReadAt: 1000 },
      sharedMembership: { id: 'shared-membership', lastNotificationsReadAt: 2000 },
      user: { id: 'user-1', displayName: 'Tor' },
      partner: { id: 'partner-1', displayName: 'Sam' },
    };
  });

  it('queries notification sources across personal and shared spaces', async () => {
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { renderer } = await renderHookValue(() => useNotifications());
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;

    expect(query.checkIns.$.where).toEqual({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });
    expect(query.reminders.$.where).toEqual({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });
    expect(query.timetableItems.$.where).toEqual({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'shared-1' }],
    });
    expect(query.reminders.createdBy).toEqual({});
    expect(query.timetableItems.timetable).toEqual({ couple: {}, createdBy: {} });
    expect(query.memories.$.where).toEqual({
      or: [{ 'space.id': 'solo-1' }, { 'space.id': 'shared-1' }],
    });

    act(() => renderer.unmount());
  });

  it('bounds notification source queries to recent rows for app startup performance', async () => {
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { renderer } = await renderHookValue(() => useNotifications());
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;

    for (const collection of ['checkIns', 'reminders', 'timetableItems', 'memories']) {
      expect(query[collection].$.order).toEqual({ createdAt: 'desc' });
      expect(query[collection].$.limit).toBe(100);
    }

    act(() => renderer.unmount());
  });

  it('uses the read timestamp for each notification source space', async () => {
    queryState.data = {
      checkIns: [],
      timetableItems: [],
      memories: [
        {
          id: 'solo-memory',
          body: 'private note',
          kind: 'post',
          isPrivate: true,
          notifyMembers: false,
          createdAt: 1500,
          space: { id: 'solo-1' },
          author: { id: 'user-1', displayName: 'Tor' },
        },
        {
          id: 'shared-memory',
          body: 'shared note',
          kind: 'post',
          createdAt: 1500,
          space: { id: 'shared-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
      ],
      reminders: [
        {
          id: 'solo-reminder',
          title: 'Private reminder',
          dueAt: 3_600_000,
          createdAt: 1500,
          couple: { id: 'solo-1' },
        },
        {
          id: 'shared-reminder',
          title: 'Shared reminder',
          dueAt: 3_600_000,
          createdAt: 1500,
          couple: { id: 'shared-1' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const items = latest.buckets.flatMap((bucket) => bucket.items);

    expect(items.find((item) => item.id === 'memory:solo-memory')?.unread).toBe(true);
    expect(items.find((item) => item.id === 'reminder:solo-reminder')?.unread).toBe(true);
    expect(items.find((item) => item.id === 'memory:shared-memory')?.unread).toBe(false);
    expect(items.find((item) => item.id === 'reminder:shared-reminder')?.unread).toBe(false);
    expect(latest.unreadCount).toBe(2);

    act(() => renderer.unmount());
  });

  it('does not surface private partner check-ins from shared spaces', async () => {
    queryState.data = {
      reminders: [],
      timetableItems: [],
      memories: [],
      checkIns: [
        {
          id: 'partner-private-checkin',
          mood: 'low',
          isPrivate: true,
          createdAt: 3000,
          couple: { id: 'shared-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
        {
          id: 'self-private-checkin',
          mood: 'steady',
          isPrivate: true,
          createdAt: 3000,
          couple: { id: 'solo-1' },
          author: { id: 'user-1', displayName: 'Tor' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const items = latest.buckets.flatMap((bucket) => bucket.items);

    expect(items.some((item) => item.id === 'checkIn:partner-private-checkin')).toBe(false);
    expect(items.some((item) => item.id === 'checkIn:self-private-checkin')).toBe(true);

    act(() => renderer.unmount());
  });

  it('keeps malformed shared privacy flags visible in partner notifications', async () => {
    queryState.data = {
      reminders: [],
      timetableItems: [],
      checkIns: [
        {
          id: 'shared-malformed-checkin',
          mood: 'bright',
          isPrivate: 'false',
          createdAt: 3000,
          couple: { id: 'shared-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
      ],
      memories: [
        {
          id: 'shared-malformed-memory',
          body: 'Shared note',
          kind: 'post',
          isPrivate: 'false',
          notifyMembers: true,
          createdAt: 3000,
          space: { id: 'shared-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const items = latest.buckets.flatMap((bucket) => bucket.items);

    expect(items.some((item) => item.id === 'checkIn:shared-malformed-checkin')).toBe(true);
    expect(items.some((item) => item.id === 'memory:shared-malformed-memory')).toBe(true);

    act(() => renderer.unmount());
  });

  it('does not surface partner-authored personal-space rows when privacy metadata is stale', async () => {
    queryState.data = {
      checkIns: [
        {
          id: 'personal-stale-partner-checkin',
          mood: 'low',
          isPrivate: false,
          createdAt: 3000,
          couple: { id: 'solo-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
        {
          id: 'personal-self-checkin',
          mood: 'steady',
          isPrivate: false,
          createdAt: 3000,
          couple: { id: 'solo-1' },
          author: { id: 'user-1', displayName: 'Tor' },
        },
      ],
      reminders: [
        {
          id: 'personal-stale-partner-reminder',
          title: 'Partner solo reminder',
          dueAt: 3_600_000,
          createdAt: 3000,
          couple: { id: 'solo-1' },
          createdBy: { id: 'partner-1', displayName: 'Sam' },
        },
        {
          id: 'personal-self-reminder',
          title: 'My solo reminder',
          dueAt: 3_600_000,
          createdAt: 3000,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1', displayName: 'Tor' },
        },
        {
          id: 'shared-partner-reminder',
          title: 'Shared partner reminder',
          dueAt: 3_600_000,
          createdAt: 3000,
          couple: { id: 'shared-1' },
          createdBy: { id: 'partner-1', displayName: 'Sam' },
        },
      ],
      timetableItems: [
        {
          id: 'personal-stale-partner-timetable-item',
          title: 'Partner solo block',
          createdAt: 3000,
          couple: { id: 'solo-1' },
          timetable: {
            id: 'personal-partner-timetable',
            couple: { id: 'solo-1' },
            createdBy: { id: 'partner-1', displayName: 'Sam' },
          },
        },
        {
          id: 'personal-self-timetable-item',
          title: 'My solo block',
          createdAt: 3000,
          couple: { id: 'solo-1' },
          timetable: {
            id: 'personal-self-timetable',
            couple: { id: 'solo-1' },
            createdBy: { id: 'user-1', displayName: 'Tor' },
          },
        },
        {
          id: 'shared-partner-timetable-item',
          title: 'Shared partner block',
          createdAt: 3000,
          couple: { id: 'shared-1' },
          timetable: {
            id: 'shared-partner-timetable',
            couple: { id: 'shared-1' },
            createdBy: { id: 'partner-1', displayName: 'Sam' },
          },
        },
      ],
      memories: [
        {
          id: 'personal-stale-partner-memory',
          body: 'Should stay personal',
          kind: 'post',
          isPrivate: false,
          createdAt: 3000,
          space: { id: 'solo-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
        {
          id: 'personal-self-memory',
          body: 'My private note',
          kind: 'post',
          isPrivate: false,
          createdAt: 3000,
          space: { id: 'solo-1' },
          author: { id: 'user-1', displayName: 'Tor' },
        },
        {
          id: 'shared-partner-memory',
          body: 'Shared update',
          kind: 'post',
          createdAt: 3000,
          space: { id: 'shared-1' },
          author: { id: 'partner-1', displayName: 'Sam' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const items = latest.buckets.flatMap((bucket) => bucket.items);

    expect(items.some((item) => item.id === 'checkIn:personal-stale-partner-checkin')).toBe(false);
    expect(items.some((item) => item.id === 'checkIn:personal-self-checkin')).toBe(true);
    expect(items.some((item) => item.id === 'reminder:personal-stale-partner-reminder')).toBe(false);
    expect(items.some((item) => item.id === 'reminder:personal-self-reminder')).toBe(true);
    expect(items.some((item) => item.id === 'reminder:shared-partner-reminder')).toBe(true);
    expect(items.some((item) => item.id === 'timetable:personal-stale-partner-timetable-item')).toBe(false);
    expect(items.some((item) => item.id === 'timetable:personal-self-timetable-item')).toBe(true);
    expect(items.some((item) => item.id === 'timetable:shared-partner-timetable-item')).toBe(true);
    expect(items.some((item) => item.id === 'memory:personal-stale-partner-memory')).toBe(false);
    expect(items.some((item) => item.id === 'memory:personal-self-memory')).toBe(true);
    expect(items.some((item) => item.id === 'memory:shared-partner-memory')).toBe(true);

    act(() => renderer.unmount());
  });

  it('does not surface timetable items whose direct space differs from their parent timetable space', async () => {
    queryState.data = {
      checkIns: [],
      reminders: [],
      memories: [],
      timetableItems: [
        {
          id: 'valid-shared-item',
          title: 'Shared block',
          createdAt: 3000,
          couple: { id: 'shared-1' },
          timetable: { id: 'shared-timetable', couple: { id: 'shared-1' } },
        },
        {
          id: 'cross-space-item',
          title: 'Wrong-space block',
          createdAt: 3000,
          couple: { id: 'shared-1' },
          timetable: { id: 'personal-timetable', couple: { id: 'solo-1' } },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] as any;
    const items = latest.buckets.flatMap((bucket) => bucket.items);

    expect(query.timetableItems.timetable).toEqual({ couple: {}, createdBy: {} });
    expect(items.some((item) => item.id === 'timetable:valid-shared-item')).toBe(true);
    expect(items.some((item) => item.id === 'timetable:cross-space-item')).toBe(false);

    act(() => renderer.unmount());
  });

  it('does not surface partner-authored personal timetable items when legacy rows inherit parent space', async () => {
    queryState.data = {
      checkIns: [],
      reminders: [],
      memories: [],
      timetableItems: [
        {
          id: 'legacy-personal-partner-item',
          title: 'Partner solo block',
          createdAt: 3000,
          timetable: {
            id: 'personal-partner-timetable',
            couple: { id: 'solo-1' },
            createdBy: { id: 'partner-1', displayName: 'Sam' },
          },
        },
        {
          id: 'legacy-personal-self-item',
          title: 'My solo block',
          createdAt: 3000,
          timetable: {
            id: 'personal-self-timetable',
            couple: { id: 'solo-1' },
            createdBy: { id: 'user-1', displayName: 'Tor' },
          },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const items = latest.buckets.flatMap((bucket) => bucket.items);

    expect(items.some((item) => item.id === 'timetable:legacy-personal-partner-item')).toBe(false);
    expect(items.some((item) => item.id === 'timetable:legacy-personal-self-item')).toBe(true);

    act(() => renderer.unmount());
  });

  it('keeps malformed legacy timestamps from creating NaN notification metadata', async () => {
    queryState.data = {
      checkIns: [],
      timetableItems: [],
      memories: [],
      reminders: [
        {
          id: 'legacy-malformed-reminder',
          title: 'Legacy reminder',
          dueAt: 'bad-due-at',
          createdAt: 'bad-created-at',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1', displayName: 'Tor' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const item = latest.buckets.flatMap((bucket) => bucket.items)[0];

    expect(latest.buckets[0]?.label).toBe('Earlier');
    expect(item).toEqual(
      expect.objectContaining({
        id: 'reminder:legacy-malformed-reminder',
        createdAt: 0,
        time: 'Unknown',
        unread: false,
        sub: 'Due date missing',
      }),
    );
    expect(JSON.stringify(item)).not.toContain('NaN');

    act(() => renderer.unmount());
  });

  it('keeps impossible ISO-like legacy timestamps from becoming real notification metadata', async () => {
    queryState.data = {
      checkIns: [],
      timetableItems: [],
      memories: [],
      reminders: [
        {
          id: 'legacy-impossible-reminder',
          title: 'Legacy reminder',
          dueAt: '2026-04-31T09:00:00.000Z',
          createdAt: '2026-02-29T09:00:00.000Z',
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1', displayName: 'Tor' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const item = latest.buckets.flatMap((bucket) => bucket.items)[0];

    expect(latest.buckets[0]?.label).toBe('Earlier');
    expect(item).toEqual(
      expect.objectContaining({
        id: 'reminder:legacy-impossible-reminder',
        createdAt: 0,
        time: 'Unknown',
        unread: false,
        sub: 'Due date missing',
      }),
    );

    act(() => renderer.unmount());
  });

  it('keeps out-of-range numeric legacy timestamps from creating NaN notification metadata', async () => {
    queryState.data = {
      checkIns: [],
      timetableItems: [],
      memories: [],
      reminders: [
        {
          id: 'legacy-out-of-range-reminder',
          title: 'Legacy reminder',
          dueAt: 9e15,
          createdAt: 9e15,
          couple: { id: 'solo-1' },
          createdBy: { id: 'user-1', displayName: 'Tor' },
        },
      ],
    };
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());
    const item = latest.buckets.flatMap((bucket) => bucket.items)[0];

    expect(latest.buckets[0]?.label).toBe('Earlier');
    expect(item).toEqual(
      expect.objectContaining({
        id: 'reminder:legacy-out-of-range-reminder',
        createdAt: 0,
        time: 'Unknown',
        unread: false,
        sub: 'Due date missing',
      }),
    );
    expect(JSON.stringify(item)).not.toContain('NaN');

    act(() => renderer.unmount());
  });

  it('marks both personal and shared notification memberships as read', async () => {
    const { useNotifications } = await import('@/src/hooks/useNotifications');
    const { latest, renderer } = await renderHookValue(() => useNotifications());

    await act(async () => {
      await latest.markAllRead();
    });

    const updatedTables = dbMock.transact.mock.calls.flatMap((call) => call[0]);
    expect(updatedTables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'memberships', id: 'solo-membership' }),
        expect.objectContaining({ table: 'memberships', id: 'shared-membership' }),
      ]),
    );

    act(() => renderer.unmount());
  });
});
