import { describe, expect, it } from 'vitest';
import { buildTodayRingSummary } from '@/src/lib/home/todayRings';

const now = new Date(2026, 3, 23, 12, 0, 0).getTime();
const earlierToday = new Date(2026, 3, 23, 9, 0, 0).getTime();
const laterToday = new Date(2026, 3, 23, 18, 0, 0).getTime();
const yesterday = new Date(2026, 3, 22, 9, 0, 0).getTime();
const tomorrow = new Date(2026, 3, 24, 9, 0, 0).getTime();

describe('buildTodayRingSummary', () => {
  it('counts due-today tasks and reminders in focus totals', () => {
    const summary = buildTodayRingSummary({
      now,
      tasks: [
        { id: 'task-open', dueDate: '2026-04-23', isCompleted: false },
        { id: 'task-done', dueDate: '2026-04-23', isCompleted: true, completedAt: earlierToday },
      ],
      reminders: [
        { id: 'reminder-open', dueAt: laterToday, isCompleted: false },
        { id: 'reminder-done', dueAt: earlierToday, isCompleted: true, completedAt: earlierToday },
      ],
      plans: [],
      events: [],
    });

    expect(summary.focus).toEqual({ done: 2, total: 4 });
  });

  it('counts tasks and reminders completed today even when not due today', () => {
    const summary = buildTodayRingSummary({
      now,
      tasks: [
        { id: 'task-no-due', dueDate: null, isCompleted: true, completedAt: earlierToday },
        { id: 'task-other-day', dueDate: '2026-04-24', isCompleted: true, completedAt: earlierToday },
        { id: 'task-old-complete', dueDate: '2026-04-24', isCompleted: true, completedAt: yesterday },
      ],
      reminders: [
        { id: 'reminder-other-day', dueAt: tomorrow, isCompleted: true, completedAt: earlierToday },
        { id: 'reminder-old-complete', dueAt: tomorrow, isCompleted: true, completedAt: yesterday },
      ],
      plans: [],
      events: [],
    });

    expect(summary.focus).toEqual({ done: 3, total: 3 });
  });

  it('keeps today plans and events in the plans ring', () => {
    const summary = buildTodayRingSummary({
      now,
      tasks: [],
      reminders: [],
      plans: [
        { id: 'active-plan', targetDate: '2026-04-23', status: 'active', isPrivate: false },
        { id: 'done-plan', targetDate: '2026-04-23', status: 'done', isPrivate: false },
        { id: 'private-plan', targetDate: '2026-04-23', status: 'done', isPrivate: true },
      ],
      events: [
        { id: 'past-event', startsAt: earlierToday, isPrivate: false },
        { id: 'future-event', startsAt: laterToday, isPrivate: false },
        { id: 'private-event', startsAt: earlierToday, isPrivate: true },
      ],
    });

    expect(summary.plans).toEqual({ done: 2, total: 4 });
  });
});
