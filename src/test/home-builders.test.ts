import { describe, expect, it } from 'vitest';
import { buildCalendarDays, buildTimelineItems, formatMonthLabel } from '@/src/lib/home/builders';
import type { TimelineItem } from '@/src/lib/home/types';

function timelineItem(
  id: string,
  occursAt: number | null,
  overrides: Partial<TimelineItem> = {},
): TimelineItem {
  return {
    id,
    type: 'event',
    sourceId: id,
    sourceTable: 'events',
    title: id,
    subtitle: null,
    occursAt,
    priority: 0,
    isPrivate: false,
    isOverdue: false,
    ...overrides,
  };
}

describe('buildTimelineItems', () => {
  it('preserves task list parent ids when list is a has-one relation object', () => {
    const items = buildTimelineItems({
      now: Date.parse('2026-05-24T09:00:00Z'),
      previewDays: 7,
      events: [],
      plans: [],
      reminders: [],
      tasks: [
        {
          id: 'task-1',
          title: 'Pack bags',
          dueDate: '2026-05-24',
          isCompleted: false,
          priority: 0,
          list: { id: 'list-1' },
        },
      ],
      rituals: [],
      memories: [],
    });

    expect(items[0]).toMatchObject({
      sourceId: 'task-1',
      sourceParentId: 'list-1',
    });
  });

  it('omits private tasks and reminders from shared timeline items', () => {
    const items = buildTimelineItems({
      now: Date.parse('2026-05-24T09:00:00Z'),
      previewDays: 7,
      events: [],
      plans: [],
      reminders: [
        {
          id: 'private-reminder',
          title: 'Private reminder',
          dueAt: Date.parse('2026-05-24T10:00:00Z'),
          isPrivate: true,
          isCompleted: false,
          priority: 0,
        },
        {
          id: 'shared-reminder',
          title: 'Shared reminder',
          dueAt: Date.parse('2026-05-24T11:00:00Z'),
          isPrivate: false,
          isCompleted: false,
          priority: 0,
        },
      ],
      tasks: [
        {
          id: 'private-task',
          title: 'Private task',
          dueDate: '2026-05-24',
          isPrivate: true,
          isCompleted: false,
          priority: 0,
        },
        {
          id: 'shared-task',
          title: 'Shared task',
          dueDate: '2026-05-24',
          isPrivate: false,
          isCompleted: false,
          priority: 0,
        },
      ],
      rituals: [],
      memories: [],
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.title).sort()).toEqual(['Shared reminder', 'Shared task']);
  });

  it('marks date-only tasks and plans overdue by the local calendar day', () => {
    const items = buildTimelineItems({
      now: Date.parse('2026-04-17T23:30:00.000Z'),
      previewDays: 7,
      events: [],
      plans: [
        {
          id: 'plan-yesterday',
          title: 'File paperwork',
          targetDate: '2026-04-17',
          status: 'active',
          priority: 0,
          isPrivate: false,
        },
      ],
      reminders: [],
      tasks: [
        {
          id: 'task-yesterday',
          title: 'Send invoice',
          dueDate: '2026-04-17',
          isCompleted: false,
          priority: 0,
          isPrivate: false,
        },
      ],
      rituals: [],
      memories: [],
    });

    expect(items.map((item) => [item.title, item.isOverdue])).toEqual([
      ['File paperwork', true],
      ['Send invoice', true],
    ]);
  });

  it('ignores impossible date-only task and plan dates before timeline accounting', () => {
    const items = buildTimelineItems({
      now: Date.parse('2026-04-17T09:00:00.000Z'),
      previewDays: 30,
      events: [],
      plans: [
        {
          id: 'bad-plan',
          title: 'Impossible plan',
          targetDate: '2026-04-31',
          status: 'active',
          priority: 0,
          isPrivate: false,
        },
      ],
      reminders: [],
      tasks: [
        {
          id: 'bad-task',
          title: 'Impossible task',
          dueDate: '2026-04-31',
          isCompleted: false,
          priority: 0,
          isPrivate: false,
        },
      ],
      rituals: [],
      memories: [],
    });

    expect(items).toEqual([]);
  });

  it('ignores finite timestamps outside the JavaScript date range before timeline accounting', () => {
    const items = buildTimelineItems({
      now: Date.parse('2026-04-17T09:00:00.000Z'),
      previewDays: 30,
      events: [
        {
          id: 'bad-event',
          title: 'Impossible event',
          startsAt: -8_640_000_000_000_001,
          isPrivate: false,
          priority: 0,
        },
      ],
      plans: [],
      reminders: [
        {
          id: 'bad-reminder',
          title: 'Impossible reminder',
          dueAt: -8_640_000_000_000_001,
          isPrivate: false,
          isCompleted: false,
          priority: 0,
        },
      ],
      tasks: [],
      rituals: [],
      memories: [],
    });

    expect(items).toEqual([]);
  });

  it('marks the calendar grid today by local date', () => {
    const days = buildCalendarDays({
      now: Date.parse('2026-04-17T23:30:00.000Z'),
      month: '2026-04',
      items: [],
    });

    expect(days.find((day) => day.date === '2026-04-17')?.isToday).toBe(false);
    expect(days.find((day) => day.date === '2026-04-18')?.isToday).toBe(true);
  });

  it('ignores malformed timeline timestamps when counting calendar grid days', () => {
    const days = buildCalendarDays({
      now: Date.parse('2026-04-17T09:00:00.000Z'),
      month: '2026-04',
      items: [
        timelineItem('malformed', Number.NaN),
        timelineItem('oversized', 8_640_000_000_000_001),
        timelineItem('valid', Date.parse('2026-04-17T12:00:00.000Z')),
      ],
    });

    expect(days.find((day) => day.date === '2026-04-17')?.itemCount).toBe(1);
  });
});

describe('formatMonthLabel', () => {
  it('formats the requested month without drifting to the previous UTC month', () => {
    expect(formatMonthLabel('2026-05')).toBe('May 2026');
    expect(formatMonthLabel('2026-06')).toBe('June 2026');
  });
});
