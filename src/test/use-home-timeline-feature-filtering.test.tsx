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
  } as any,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
    getAuth: vi.fn(async () => ({ refresh_token: null })),
  },
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
    };
  });

  it('does not expose a featured signal when checkins are disabled', async () => {
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

    expect(latest.hero).toBeNull();

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
});
