import { describe, expect, it } from 'vitest';
import { buildActivityHeatmapDays } from '@/src/lib/home/activity';

describe('home activity heatmap data', () => {
  it('aggregates real dated records into daily activity weights', () => {
    const days = buildActivityHeatmapDays({
      now: Date.parse('2026-05-04T12:00:00.000Z'),
      weeks: 2,
      tasks: [
        {
          id: 'task-1',
          title: 'Done task',
          createdAt: Date.parse('2026-04-24T09:00:00.000Z'),
          completedAt: Date.parse('2026-04-29T10:00:00.000Z'),
          dueDate: '2026-04-29',
        },
        {
          id: 'future-task',
          title: 'Future task',
          dueDate: '2026-05-20',
          createdAt: Date.parse('2026-05-20T09:00:00.000Z'),
        },
      ],
      reminders: [
        {
          id: 'reminder-1',
          title: 'Paid bill',
          dueAt: Date.parse('2026-04-29T18:00:00.000Z'),
          completedAt: Date.parse('2026-04-29T18:05:00.000Z'),
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
      loveNotes: [
        {
          id: 'note-1',
          createdAt: Date.parse('2026-04-29T21:00:00.000Z'),
        },
      ],
    });

    expect(days).toHaveLength(14);
    // 2026-04-29: task-1 (dueDate+completedAt → dedup to 1) + reminder-1
    // (dueAt+completedAt → dedup to 1) + note-1 (createdAt → 1) = 3 distinct
    // entities touched this day.
    expect(days.find((day) => day.dateKey === '2026-04-29')).toMatchObject({
      count: 3,
      weight: 3,
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
});
