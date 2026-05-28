import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '@/src/lib/home/types';
import {
  addDaysIso,
  buildTomorrowCard,
  buildWeekStrip,
  computeHeroStats,
  filterAgendaForDate,
  formatAgendaDayHeader,
  toDateString,
} from '@/src/lib/calendar/builders';

function event(
  id: string,
  occursAt: number,
  overrides: Partial<TimelineItem> = {},
): TimelineItem {
  return {
    id,
    type: 'event',
    sourceId: id,
    sourceTable: 'events',
    title: `Event ${id}`,
    subtitle: null,
    occursAt,
    priority: 0,
    isPrivate: false,
    isOverdue: false,
    ...overrides,
  };
}

describe('calendar builders', () => {
  describe('addDaysIso', () => {
    it('adds and subtracts days correctly', () => {
      expect(addDaysIso('2026-04-17', 1)).toBe('2026-04-18');
      expect(addDaysIso('2026-04-01', -1)).toBe('2026-03-31');
      expect(addDaysIso('2026-04-30', 1)).toBe('2026-05-01');
    });
  });

  describe('computeHeroStats', () => {
    const now = Date.parse('2026-04-17T10:00:00.000Z');
    const mkTs = (iso: string) => Date.parse(iso);

    it('counts items inside the month only', () => {
      const items = [
        event('a', mkTs('2026-04-10T09:00:00Z')),
        event('b', mkTs('2026-04-17T18:00:00Z')),
        event('c', mkTs('2026-05-02T09:00:00Z')),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items });
      expect(stats.total).toBe(2);
    });

    it('counts private events as not shared', () => {
      const items = [
        event('a', mkTs('2026-04-18T09:00:00Z'), { isPrivate: true }),
        event('b', mkTs('2026-04-19T09:00:00Z'), { isPrivate: false }),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items });
      expect(stats.shared).toBe(1);
      expect(stats.total).toBe(2);
    });

    it('only counts future events as upcoming', () => {
      const items = [
        event('past', mkTs('2026-04-17T08:00:00Z')),
        event('future', mkTs('2026-04-17T12:00:00Z')),
        event('tomorrow', mkTs('2026-04-18T09:00:00Z')),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items });
      expect(stats.upcoming).toBe(2);
    });

    it('reports nextInHours to the earliest upcoming event', () => {
      const items = [
        event('later', mkTs('2026-04-17T18:00:00Z')),
        event('sooner', mkTs('2026-04-17T13:00:00Z')),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items });
      expect(stats.nextInHours).toBe(3);
    });

    it('returns null nextInHours when no upcoming events', () => {
      const stats = computeHeroStats({ now, month: '2026-04', items: [] });
      expect(stats.nextInHours).toBeNull();
      expect(stats.total).toBe(0);
    });

    it('counts late-night events in the local calendar month', () => {
      const items = [event('month-edge', Date.parse('2026-03-31T23:30:00.000Z'))];
      const stats = computeHeroStats({
        now: Date.parse('2026-03-31T23:00:00.000Z'),
        month: '2026-04',
        items,
      });

      expect(stats.total).toBe(1);
      expect(stats.upcoming).toBe(1);
    });

    it('ignores malformed timeline timestamps without crashing calendar summaries', () => {
      const valid = event('valid', mkTs('2026-04-17T12:00:00Z'));
      const malformed = event('malformed', Number.NaN);
      const oversized = event('oversized', 8_640_000_000_000_001);
      const items = [malformed, oversized, valid];

      expect(computeHeroStats({ now, month: '2026-04', items })).toMatchObject({
        total: 1,
        upcoming: 1,
      });
      expect(
        buildWeekStrip({
          selectedDate: '2026-04-17',
          today: '2026-04-17',
          items,
        }).find((day) => day.date === '2026-04-17')?.hasEvent,
      ).toBe(true);
      expect(filterAgendaForDate(items, '2026-04-17').map((item) => item.id)).toEqual(['valid']);
      expect(buildTomorrowCard({ selectedDate: '2026-04-16', items })?.id).toBe('valid');
    });
  });

  describe('buildWeekStrip', () => {
    it('returns 7 days Mon→Sun anchored around selected date', () => {
      // 2026-04-17 is a Friday
      const week = buildWeekStrip({
        selectedDate: '2026-04-17',
        today: '2026-04-17',
        items: [],
      });
      expect(week).toHaveLength(7);
      expect(week[0].date).toBe('2026-04-13'); // Monday
      expect(week[6].date).toBe('2026-04-19'); // Sunday
      expect(week.find((d) => d.isSelected)?.date).toBe('2026-04-17');
      expect(week.find((d) => d.isToday)?.date).toBe('2026-04-17');
    });

    it('handles Sunday anchor (should still start on Monday prior)', () => {
      // 2026-04-19 is Sunday
      const week = buildWeekStrip({
        selectedDate: '2026-04-19',
        today: '2026-04-19',
        items: [],
      });
      expect(week[0].date).toBe('2026-04-13');
      expect(week[6].date).toBe('2026-04-19');
    });

    it('marks days that have events', () => {
      const items = [event('a', Date.parse('2026-04-15T09:00:00Z'))];
      const week = buildWeekStrip({
        selectedDate: '2026-04-17',
        today: '2026-04-17',
        items,
      });
      expect(week.find((d) => d.date === '2026-04-15')?.hasEvent).toBe(true);
      expect(week.find((d) => d.date === '2026-04-18')?.hasEvent).toBe(false);
      expect(week.find((d) => d.date === '2026-04-14')?.hasEvent).toBe(false);
    });

    it('marks late-night timestamp events on the local calendar day', () => {
      const items = [event('late', Date.parse('2026-04-17T23:30:00.000Z'))];
      const week = buildWeekStrip({
        selectedDate: '2026-04-18',
        today: '2026-04-18',
        items,
      });

      expect(week.find((d) => d.date === '2026-04-17')?.hasEvent).toBe(false);
      expect(week.find((d) => d.date === '2026-04-18')?.hasEvent).toBe(true);
    });
  });

  describe('filterAgendaForDate', () => {
    it('returns items whose occursAt falls on the target date, sorted', () => {
      const items = [
        event('late', Date.parse('2026-04-17T20:30:00Z')),
        event('early', Date.parse('2026-04-17T09:00:00Z')),
        event('other', Date.parse('2026-04-18T09:00:00Z')),
      ];
      const list = filterAgendaForDate(items, '2026-04-17');
      expect(list.map((i) => i.id)).toEqual(['early', 'late']);
    });

    it('filters timestamped events by the local calendar date', () => {
      const items = [event('late', Date.parse('2026-04-17T23:30:00.000Z'))];

      expect(filterAgendaForDate(items, '2026-04-17')).toEqual([]);
      expect(filterAgendaForDate(items, '2026-04-18').map((i) => i.id)).toEqual(['late']);
      expect(toDateString(Date.parse('2026-04-17T23:30:00.000Z'))).toBe('2026-04-18');
    });
  });

  describe('buildTomorrowCard', () => {
    it('returns the next-day event', () => {
      const items = [event('e', Date.parse('2026-04-18T09:00:00Z'))];
      const card = buildTomorrowCard({ selectedDate: '2026-04-17', items });
      expect(card?.kind).toBe('event');
      expect(card?.id).toBe('e');
    });

    it('returns null when nothing follows', () => {
      const card = buildTomorrowCard({
        selectedDate: '2026-04-17',
        items: [],
      });
      expect(card).toBeNull();
    });
  });

  describe('formatAgendaDayHeader', () => {
    it('renders uppercase WEEKDAY · DD MON', () => {
      expect(formatAgendaDayHeader('2026-04-17')).toBe('FRIDAY · 17 APR');
    });
  });
});
