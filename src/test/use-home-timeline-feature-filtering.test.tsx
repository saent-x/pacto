import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionState = vi.hoisted(() => ({
  activeCouple: {
    couple: { id: 'couple-1', name: 'Couple', anniversary: null as string | null },
    memberCount: 2,
    partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
  },
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
    milestones: [],
    journalEntries: [],
    loveNotes: [],
    dailyVerseCache: [],
    wishlistItems: [],
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

const todayDateKey = () => new Date().toISOString().slice(0, 10);

describe('useHomeTimeline feature filtering', () => {
  beforeEach(() => {
    sessionState.activeCouple = {
      couple: { id: 'couple-1', name: 'Couple', anniversary: null },
      memberCount: 2,
      partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
    };
    sessionState.profile = { id: 'me', displayName: 'Alex', avatarUrl: null };
    sessionState.isFeatureEnabled = vi.fn(() => true);
    queryState.data = {
      events: [],
      plans: [],
      rituals: [],
      checkIns: [],
      reminders: [],
      tasks: [],
      milestones: [],
      journalEntries: [],
      loveNotes: [],
      dailyVerseCache: [],
      wishlistItems: [],
      timetableItems: [],
      memories: [],
    };
    dbMock.useQuery.mockClear();
    dbMock.getAuth.mockClear();
    dbMock.useQuery.mockReturnValue({ data: queryState.data, isLoading: false, error: null });
  });

  it('does not query disabled feature tables', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) =>
      ['calendar', 'memories'].includes(featureId),
    );

    const { renderer } = await renderHookValue();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.events).toBeDefined();
    expect(query.milestones).toBeDefined();
    expect(query.loveNotes).toBeDefined();
    expect(query.dailyVerseCache).toBeDefined();
    expect(query.plans).toBeUndefined();
    expect(query.rituals).toBeUndefined();
    expect(query.reminders).toBeUndefined();
    expect(query.checkIns).toBeUndefined();
    expect(query.tasks).toBeUndefined();
    expect(query.journalEntries).toBeUndefined();

    act(() => renderer.unmount());
  });

  it('removes check-in hero content when checkins are disabled but still exposes enabled memory signals', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'checkins');
    queryState.data.checkIns = [
      {
        id: 'checkin-1',
        note: 'Shared pulse',
        isPrivate: false,
        createdAt: Date.now(),
      },
    ];
    queryState.data.loveNotes = [
      {
        id: 'love-note-1',
        body: 'Still thinking about that walk.',
        isPrivate: false,
        createdAt: Date.now() - 1000,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.hero).toMatchObject({
      kind: 'loveNote',
      sourceId: 'love-note-1',
      sourceTable: 'loveNotes',
    });

    act(() => renderer.unmount());
  });

  it('falls back to enabled milestone or presence hero when checkins are disabled', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'checkins');
    queryState.data.checkIns = [
      {
        id: 'checkin-1',
        note: 'Shared pulse',
        isPrivate: false,
        createdAt: Date.now(),
      },
    ];
    queryState.data.milestones = [
      {
        id: 'milestone-1',
        title: 'Launch day',
        date: todayDateKey(),
        description: null,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.hero).toMatchObject({
      kind: 'countdown',
      sourceId: 'milestone:milestone-1',
      sourceTable: 'milestones',
    });

    act(() => renderer.unmount());
  });

  it('does not build anniversary or milestone content when memories are disabled', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'memories');
    sessionState.activeCouple = {
      ...sessionState.activeCouple,
      couple: {
        ...sessionState.activeCouple.couple,
        anniversary: todayDateKey(),
      },
    };
    queryState.data.milestones = [
      {
        id: 'milestone-1',
        title: 'Launch day',
        date: todayDateKey(),
        description: null,
      },
    ];

    const { latest, renderer } = await renderHookValue();

    expect(latest.milestones).toEqual([]);
    expect(latest.hero?.kind).not.toBe('countdown');
    expect(latest.hero?.sourceId).not.toBe('milestone:milestone-1');

    act(() => renderer.unmount());
  });

  it('builds activity from live dated records returned by the home query', async () => {
    const today = todayDateKey();
    queryState.data.tasks = [
      {
        id: 'task-1',
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
});
