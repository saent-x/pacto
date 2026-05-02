import React from 'react';
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';

const sessionState = vi.hoisted(() => ({
  activeCouple: {
    couple: {
      id: 'couple-1',
      name: 'Couple',
      anniversary: null as string | null,
      enabledFeatures: [] as string[],
    },
    memberCount: 2,
    partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
  },
  isFeatureEnabled: vi.fn(() => true),
}));

const queryState = vi.hoisted(() => ({
  data: {
    events: [],
    plans: [],
    reminders: [],
    tasks: [],
    rituals: [],
    milestones: [],
  } as any,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false, error: null })),
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

async function renderCalendarContext() {
  const { CalendarProvider, useCalendar } = await import('@/src/lib/calendar/context');
  let latest: ReturnType<typeof useCalendar> | null = null;

  function Probe() {
    latest = useCalendar();
    return null;
  }

  let renderer: any = null;
  await act(async () => {
    renderer = TestRenderer.create(
      <CalendarProvider>
        <Probe />
      </CalendarProvider>,
    );
  });

  return { latest: latest!, renderer };
}

describe('CalendarProvider feature filtering', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));
    sessionState.activeCouple = {
      couple: {
        id: 'couple-1',
        name: 'Couple',
        anniversary: null,
        enabledFeatures: [],
      },
      memberCount: 2,
      partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
    };
    sessionState.isFeatureEnabled = vi.fn(() => true);
    queryState.data = {
      events: [],
      plans: [],
      reminders: [],
      tasks: [],
      rituals: [],
      milestones: [],
    };
    dbMock.useQuery.mockClear();
    dbMock.useQuery.mockReturnValue({ data: queryState.data, isLoading: false, error: null });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('excludes task agenda items when tasks are disabled but keeps recurring reminders', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'tasks');
    queryState.data.reminders = [
      {
        id: 'reminder-1',
        title: 'Water plants',
        dueAt: Date.parse('2026-04-17T15:00:00.000Z'),
        isCompleted: false,
        priority: 0,
      },
    ];
    queryState.data.tasks = [
      {
        id: 'task-1',
        title: 'Pay invoice',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.agenda.map((item) => item.title)).toContain('Water plants');
    expect(latest.agenda.map((item) => item.title)).not.toContain('Pay invoice');

    act(() => renderer.unmount());
  });

  it('excludes memory milestones and anniversary countdowns from derived calendar summaries when memories are disabled', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) => featureId !== 'memories');
    sessionState.activeCouple = {
      ...sessionState.activeCouple,
      couple: {
        ...sessionState.activeCouple.couple,
        anniversary: '2026-04-18',
      },
    };
    queryState.data.milestones = [
      {
        id: 'milestone-1',
        title: 'First apartment',
        date: '2026-04-18',
        description: 'Move-in day',
      },
    ];

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.week.find((day) => day.date === '2026-04-18')?.hasEvent).toBe(false);
    expect(latest.agenda.map((item) => item.title)).not.toContain('First apartment');
    expect(latest.tomorrow).toBeNull();
    expect(latest.heroStats.total).toBe(0);
    expect(latest.heroStats.shared).toBe(0);

    act(() => renderer.unmount());
  });

  it('omits disabled feature tables from the Instant query and keeps enabled source tables', async () => {
    sessionState.isFeatureEnabled = vi.fn((featureId: string) =>
      ['calendar', 'recurring'].includes(featureId),
    );

    const { renderer } = await renderCalendarContext();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.events).toBeDefined();
    expect(query.reminders).toBeDefined();
    expect(query.rituals).toBeDefined();
    expect(query.plans).toBeUndefined();
    expect(query.tasks).toBeUndefined();
    expect(query.milestones).toBeUndefined();

    act(() => renderer.unmount());
  });
});
