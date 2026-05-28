import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionState = vi.hoisted(() => ({
  activeCouple: {
    couple: { id: 'couple-1', name: 'Couple' },
    memberCount: 2,
    partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
  },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'couple-1',
  profile: { id: 'me', displayName: 'Alex', avatarUrl: null },
  isFeatureEnabled: vi.fn(() => true),
}));

const queryState = vi.hoisted(() => ({
  data: {
    events: [],
    plans: [],
    rituals: [],
    checkIns: [],
    reminders: [],
    tasks: [],
    journalEntries: [],
    dailyVerseCache: [],
    timetableItems: [],
    memories: [],
  } as any,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
  getAuth: vi.fn(async () => ({ refresh_token: null })),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

async function renderHookValue() {
  const { useHomeTimeline } = await import('@/src/hooks/useHomeTimeline');
  let latest: ReturnType<typeof useHomeTimeline> | null = null;

  function Probe() {
    latest = useHomeTimeline({ previewDays: 30 });
    return null;
  }

  let renderer: any = null;
  await act(async () => {
    renderer = TestRenderer.create(<Probe />);
    await flush();
  });

  return { latest: latest!, renderer };
}

const todayDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('useHomeTimeline feature filtering', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionState.activeCouple = {
      couple: { id: 'couple-1', name: 'Couple' },
      memberCount: 2,
      partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
    };
    sessionState.profile = { id: 'me', displayName: 'Alex', avatarUrl: null };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'couple-1';
    sessionState.isFeatureEnabled = vi.fn(() => true);
    queryState.data = {
      events: [],
      plans: [],
      rituals: [],
      checkIns: [],
      reminders: [],
      tasks: [],
      journalEntries: [],
      dailyVerseCache: [],
      timetableItems: [],
      memories: [],
    };
    dbMock.useQuery.mockClear();
    dbMock.getAuth.mockClear();
    dbMock.useQuery.mockReturnValue({ data: queryState.data, isLoading: false, error: null });
  });

  it('does not query disabled feature tables', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) =>
      ['calendar', 'memoryFeed'].includes(featureId),
    );

    const { renderer } = await renderHookValue();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.events).toBeDefined();
    expect(query.memories).toBeDefined();
    expect(query.dailyVerseCache).toBeDefined();
    expect(query.plans).toBeUndefined();
    expect(query.rituals).toBeUndefined();
    expect(query.reminders).toBeUndefined();
    expect(query.checkIns).toBeUndefined();
    expect(query.tasks).toBeUndefined();
    expect(query.journalEntries).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('does not query timetable items because recurring slots are ignored by home activity', async () => {
    sessionState.isFeatureEnabled = vi.fn(() => true);

    const { renderer } = await renderHookValue();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.timetableItems).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('bounds high-traffic source queries to the Home activity and preview windows', async () => {
    const { renderer } = await renderHookValue();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.events.$.limit).toBeGreaterThan(0);
    expect(query.events.$.order).toEqual({ startsAt: 'asc' });
    expect(query.events.$.where.startsAt).toEqual({
      $gte: expect.any(Number),
      $lte: expect.any(Number),
    });
    expect(query.plans.$.order).toEqual({ targetDate: 'asc' });
    expect(query.plans.$.where.targetDate).toEqual({
      $gte: expect.any(String),
      $lte: expect.any(String),
    });
    expect(query.reminders.$.order).toEqual({ dueAt: 'asc' });
    expect(query.reminders.$.where.dueAt).toEqual({
      $gte: expect.any(Number),
      $lte: expect.any(Number),
    });
    expect(query.tasks.$.order).toEqual({ dueDate: 'asc' });
    expect(query.tasks.$.where.dueDate).toEqual({
      $gte: expect.any(String),
      $lte: expect.any(String),
    });
    expect(query.checkIns.$.order).toEqual({ checkInDate: 'desc' });
    expect(query.checkIns.$.where.checkInDate).toEqual({
      $gte: expect.any(String),
      $lte: expect.any(String),
    });
    expect(query.journalEntries.$.order).toEqual({ entryDate: 'desc' });
    expect(query.journalEntries.$.where.entryDate).toEqual({
      $gte: expect.any(String),
      $lte: expect.any(String),
    });
    expect(query.memories.$.order).toEqual({ createdAt: 'desc' });
    expect(query.memories.$.where.createdAt).toEqual({
      $gte: expect.any(Number),
      $lte: expect.any(Number),
    });

    act(() => renderer.unmount());
  });

  it('removes check-in hero content when checkins are disabled and falls back to presence', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'checkins');
    queryState.data.checkIns = [
      {
        id: 'checkin-1',
        note: 'Shared pulse',
        isPrivate: false,
        createdAt: Date.now(),
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.hero).toMatchObject({
      kind: 'presence',
      sourceId: 'couple-1',
      sourceTable: 'couples',
    });

    act(() => renderer.unmount());
  });

  it('builds activity from live dated records returned by the home query', async () => {
    const today = todayDateKey();
    queryState.data.tasks = [
      {
        id: 'task-1',
        couple: { id: 'couple-1' },
        list: { couple: { id: 'couple-1' } },
        title: 'Finish setup',
        dueDate: today,
        completedAt: Date.now(),
        createdAt: Date.now(),
      },
    ];
    queryState.data.checkIns = [
      {
        id: 'checkin-1',
        checkInDate: today,
        createdAt: Date.now(),
      },
    ];

    const { latest, renderer } = await renderHookValue();
    const todayCell = latest.activity.find((day) => day.dateKey === today);

    // task-1 + checkin-1 = 2 distinct entities touched today (dedup collapses
    // task's dueDate + completedAt → 1, checkin's single checkInDate → 1).
    expect(todayCell).toMatchObject({
      dateKey: today,
      weight: 2,
    });
    expect(todayCell?.count).toBe(2);

    act(() => renderer.unmount());
  });

  it('does not count personal-space legacy private rows as shared home activity', async () => {
    const today = todayDateKey();
    queryState.data.plans = [
      {
        id: 'personal-plan',
        couple: { id: 'solo-1' },
        title: 'Personal plan',
        targetDate: today,
        isPrivate: false,
        status: 'active',
        priority: 0,
      },
      {
        id: 'shared-plan',
        couple: { id: 'couple-1' },
        title: 'Shared plan',
        targetDate: today,
        isPrivate: false,
        status: 'active',
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.timeline.map((item) => item.title)).toEqual(['Shared plan']);
    expect(latest.todaySummary.plans).toEqual({ done: 0, total: 1 });
    expect(latest.activity.find((day) => day.dateKey === today)?.count).toBe(1);

    act(() => renderer.unmount());
  });

  it('keeps malformed shared target privacy flags visible in shared home activity', async () => {
    const today = todayDateKey();
    queryState.data.plans = [
      {
        id: 'shared-malformed-plan',
        couple: { id: 'couple-1' },
        title: 'Shared malformed plan',
        targetDate: today,
        isPrivate: 'false',
        status: 'active',
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.timeline.map((item) => item.title)).toEqual(['Shared malformed plan']);
    expect(latest.todaySummary.plans).toEqual({ done: 0, total: 1 });
    expect(latest.activity.find((day) => day.dateKey === today)?.count).toBe(1);

    act(() => renderer.unmount());
  });

  it('does not count personal-space tasks and reminders as shared home focus or activity', async () => {
    const today = todayDateKey();
    const dueAt = Date.parse(`${today}T15:00:00.000Z`);
    queryState.data.tasks = [
      {
        id: 'personal-task',
        couple: { id: 'solo-1' },
        list: { couple: { id: 'solo-1' } },
        title: 'Personal task',
        dueDate: today,
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'shared-task',
        couple: { id: 'couple-1' },
        list: { couple: { id: 'couple-1' } },
        title: 'Shared task',
        dueDate: today,
        isCompleted: false,
        priority: 0,
      },
    ];
    queryState.data.reminders = [
      {
        id: 'personal-reminder',
        couple: { id: 'solo-1' },
        title: 'Personal reminder',
        dueAt,
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'shared-reminder',
        couple: { id: 'couple-1' },
        title: 'Shared reminder',
        dueAt,
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.timeline.map((item) => item.title).sort()).toEqual([
      'Shared reminder',
      'Shared task',
    ]);
    expect(latest.todaySummary.focus).toEqual({ done: 0, total: 2 });
    expect(latest.activity.find((day) => day.dateKey === today)?.count).toBe(2);

    act(() => renderer.unmount());
  });

  it('does not count tasks whose direct space differs from their parent list space', async () => {
    const today = todayDateKey();
    queryState.data.tasks = [
      {
        id: 'valid-task',
        couple: { id: 'couple-1' },
        list: { id: 'shared-list', couple: { id: 'couple-1' } },
        title: 'Shared task',
        dueDate: today,
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'cross-space-task',
        couple: { id: 'couple-1' },
        list: { id: 'personal-list', couple: { id: 'solo-1' } },
        title: 'Wrong-space task',
        dueDate: today,
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderHookValue();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.tasks.list).toEqual({ couple: {} });
    expect(latest.timeline.map((item) => item.title)).toEqual(['Shared task']);
    expect(latest.todaySummary.focus).toEqual({ done: 0, total: 1 });
    expect(latest.activity.find((day) => day.dateKey === today)?.count).toBe(1);

    act(() => renderer.unmount());
  });

  it('does not count legacy tasks that inherit a personal parent-list space', async () => {
    const today = todayDateKey();
    queryState.data.tasks = [
      {
        id: 'legacy-personal-task',
        list: { id: 'personal-list', couple: { id: 'solo-1' } },
        title: 'Legacy personal task',
        dueDate: today,
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'legacy-shared-task',
        list: { id: 'shared-list', couple: { id: 'couple-1' } },
        title: 'Legacy shared task',
        dueDate: today,
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.timeline.map((item) => item.title)).toEqual(['Legacy shared task']);
    expect(latest.todaySummary.focus).toEqual({ done: 0, total: 1 });
    expect(latest.activity.find((day) => day.dateKey === today)?.count).toBe(1);

    act(() => renderer.unmount());
  });

  it('does not request auth or warm daily verse when the API base URL is not configured', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchSpy);
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'token-1' });

    const { renderer } = await renderHookValue();

    expect(dbMock.getAuth).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });
});
