import React from 'react';
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';

const sessionState = vi.hoisted(() => ({
  activeCouple: {
    couple: {
      id: 'couple-1',
      name: 'Couple',
      enabledFeatures: [] as string[],
    },
    memberCount: 2,
    partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
  },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'couple-1',
  isFeatureEnabled: vi.fn(() => true),
}));

const queryState = vi.hoisted(() => ({
  data: {
    events: [],
    plans: [],
    reminders: [],
    tasks: [],
    rituals: [],
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
        enabledFeatures: [],
      },
      memberCount: 2,
      partner: { id: 'partner-1', displayName: 'Sam', avatarUrl: null },
    };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'couple-1';
    sessionState.isFeatureEnabled = vi.fn(() => true);
    queryState.data = {
      events: [],
      plans: [],
      reminders: [],
      tasks: [],
      rituals: [],
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

  it('excludes retired milestone data from derived calendar summaries', async () => {
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

  it('queries calendar source tables across permanent solo and active shared spaces', async () => {
    const { renderer } = await renderCalendarContext();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.events.$.where).toMatchObject({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
    });
    expect(query.plans.$.where).toMatchObject({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
    });
    expect(query.reminders.$.where).toMatchObject({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
    });
    expect(query.reminders.couple).toEqual({});
    expect(query.tasks.$.where).toMatchObject({
      or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
    });
    expect(query.tasks.couple).toEqual({});

    act(() => renderer.unmount());
  });

  it('bounds calendar source queries to the selected month window', async () => {
    const { renderer } = await renderCalendarContext();
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
    expect(query.rituals.$.limit).toBeGreaterThan(0);
    expect(query.rituals.$.order).toEqual({ createdAt: 'desc' });

    act(() => renderer.unmount());
  });

  it('uses the local calendar date instead of the UTC date around midnight', async () => {
    vi.setSystemTime(new Date('2026-04-17T23:30:00.000Z'));

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.today).toBe('2026-04-18');
    expect(latest.selectedDate).toBe('2026-04-18');
    expect(latest.month).toBe('2026-04');

    act(() => renderer.unmount());
  });

  it('does not surface personal-space legacy private rows as shared agenda items', async () => {
    queryState.data.plans = [
      {
        id: 'personal-plan',
        couple: { id: 'solo-1' },
        title: 'Personal plan',
        targetDate: '2026-04-17',
        isPrivate: false,
        status: 'active',
        priority: 0,
      },
      {
        id: 'shared-plan',
        couple: { id: 'couple-1' },
        title: 'Shared plan',
        targetDate: '2026-04-17',
        isPrivate: false,
        status: 'active',
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.agenda.map((item) => item.title)).toEqual(['Shared plan']);
    expect(latest.heroStats.shared).toBe(1);

    act(() => renderer.unmount());
  });

  it('keeps malformed shared target privacy flags visible in shared agenda items', async () => {
    queryState.data.plans = [
      {
        id: 'shared-malformed-plan',
        couple: { id: 'couple-1' },
        title: 'Shared malformed plan',
        targetDate: '2026-04-17',
        isPrivate: 'false',
        status: 'active',
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.agenda.map((item) => item.title)).toEqual(['Shared malformed plan']);
    expect(latest.heroStats.shared).toBe(1);

    act(() => renderer.unmount());
  });

  it('does not surface personal-space tasks and reminders as shared agenda items', async () => {
    queryState.data.reminders = [
      {
        id: 'personal-reminder',
        couple: { id: 'solo-1' },
        title: 'Personal reminder',
        dueAt: Date.parse('2026-04-17T15:00:00.000Z'),
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'shared-reminder',
        couple: { id: 'couple-1' },
        title: 'Shared reminder',
        dueAt: Date.parse('2026-04-17T16:00:00.000Z'),
        isCompleted: false,
        priority: 0,
      },
    ];
    queryState.data.tasks = [
      {
        id: 'personal-task',
        couple: { id: 'solo-1' },
        list: { couple: { id: 'solo-1' } },
        title: 'Personal task',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'shared-task',
        couple: { id: 'couple-1' },
        list: { couple: { id: 'couple-1' } },
        title: 'Shared task',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.agenda.map((item) => item.title)).toEqual(['Shared task', 'Shared reminder']);
    expect(latest.heroStats.total).toBe(2);
    expect(latest.heroStats.shared).toBe(2);

    act(() => renderer.unmount());
  });

  it('does not surface tasks whose direct space differs from their parent list space', async () => {
    queryState.data.tasks = [
      {
        id: 'valid-task',
        couple: { id: 'couple-1' },
        list: { id: 'shared-list', couple: { id: 'couple-1' } },
        title: 'Shared task',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'cross-space-task',
        couple: { id: 'couple-1' },
        list: { id: 'personal-list', couple: { id: 'solo-1' } },
        title: 'Wrong-space task',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderCalendarContext();
    const query = dbMock.useQuery.mock.calls.at(-1)?.[0] ?? {};

    expect(query.tasks.list).toEqual({ couple: {} });
    expect(latest.agenda.map((item) => item.title)).toEqual(['Shared task']);
    expect(latest.heroStats.total).toBe(1);
    expect(latest.heroStats.shared).toBe(1);

    act(() => renderer.unmount());
  });

  it('does not surface legacy tasks that inherit a personal parent-list space', async () => {
    queryState.data.tasks = [
      {
        id: 'legacy-personal-task',
        list: { id: 'personal-list', couple: { id: 'solo-1' } },
        title: 'Legacy personal task',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
      {
        id: 'legacy-shared-task',
        list: { id: 'shared-list', couple: { id: 'couple-1' } },
        title: 'Legacy shared task',
        dueDate: '2026-04-17',
        isCompleted: false,
        priority: 0,
      },
    ];

    const { latest, renderer } = await renderCalendarContext();

    expect(latest.agenda.map((item) => item.title)).toEqual(['Legacy shared task']);
    expect(latest.heroStats.total).toBe(1);
    expect(latest.heroStats.shared).toBe(1);

    act(() => renderer.unmount());
  });
});
