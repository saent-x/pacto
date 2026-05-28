import { describe, expect, it } from 'vitest';
import { buildActivityHeatmapDays } from '@/src/lib/home/activity';

describe('home activity heatmap data', () => {
  it('aggregates real dated records into daily activity weights', () => {
    const days = buildActivityHeatmapDays({
      now: Date.parse('2026-05-04T12:00:00.000Z'),
      weeks: 2,
      reminders: [
        {
          id: 'reminder-1',
          title: 'Paid bill',
          dueAt: Date.parse('2026-04-29T18:00:00.000Z'),
          completedAt: Date.parse('2026-04-29T18:05:00.000Z'),
        },
        {
          id: 'private-reminder',
          title: 'Private bill',
          dueAt: Date.parse('2026-04-29T20:00:00.000Z'),
          isPrivate: true,
        },
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Done task',
          createdAt: Date.parse('2026-04-24T09:00:00.000Z'),
          completedAt: Date.parse('2026-04-29T10:00:00.000Z'),
          dueDate: '2026-04-29',
        },
        {
          id: 'private-task',
          title: 'Private task',
          dueDate: '2026-04-29',
          isPrivate: true,
        },
        {
          id: 'future-task',
          title: 'Future task',
          dueDate: '2026-05-20',
          createdAt: Date.parse('2026-05-20T09:00:00.000Z'),
        },
      ],
      checkIns: [
        {
          id: 'checkin-1',
          checkInDate: '2026-05-03',
          createdAt: Date.parse('2026-05-03T20:00:00.000Z'),
        },
      ],
      journalEntries: [
        {
          id: 'private-entry',
          entryDate: '2026-05-03',
          createdAt: Date.parse('2026-05-03T20:30:00.000Z'),
          isPrivate: true,
        },
      ],
    });

    expect(days).toHaveLength(14);
    // 2026-04-29: task-1 (dueDate+completedAt → dedup to 1) + reminder-1
    // (dueAt+completedAt → dedup to 1) = 2 distinct
    // entities touched this day.
    expect(days.find((day) => day.dateKey === '2026-04-29')).toMatchObject({
      count: 2,
      weight: 2,
    });
    // 2026-05-03: checkin-1 → 1. private journal entry skipped.
    expect(days.find((day) => day.dateKey === '2026-05-03')).toMatchObject({
      count: 1,
      weight: 1,
    });
    expect(days.find((day) => day.dateKey === '2026-05-04')).toMatchObject({
      count: 0,
      weight: 0,
    });
    // Future-dated rows are dropped — heatmap reflects what already happened.
    expect(days.some((day) => day.dateKey === '2026-05-20')).toBe(false);
  });

  it('ignores impossible ISO-like dates instead of rolling them into activity days', () => {
    const days = buildActivityHeatmapDays({
      now: Date.parse('2026-05-04T12:00:00.000Z'),
      weeks: 2,
      events: [
        { id: 'bad-event', startsAt: '2026-04-31T10:00:00' },
      ],
      reminders: [
        { id: 'bad-reminder', dueAt: '2026-04-31T11:00:00' },
      ],
      tasks: [
        { id: 'bad-task', completedAt: '2026-04-31T12:00:00' },
      ],
      memories: [
        { id: 'bad-memory', createdAt: '2026-04-31T13:00:00' },
      ],
    });

    expect(days.find((day) => day.dateKey === '2026-05-01')).toMatchObject({
      count: 0,
      weight: 0,
    });
  });
});
