import { describe, expect, it } from 'vitest';
import type { MilestoneStripItem, TimelineItem } from '@/src/lib/home/types';
import {
  addDaysIso,
  buildTomorrowCard,
  buildWeekStrip,
  computeHeroStats,
  filterAgendaForDate,
  formatAgendaDayHeader,
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

function milestone(id: string, date: string, title = 'Anniversary'): MilestoneStripItem {
  return { id, type: 'milestone', title, subtitle: null, date, daysUntil: 0 };
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

    it('counts items + milestones inside the month only', () => {
      const items = [
        event('a', mkTs('2026-04-10T09:00:00Z')),
        event('b', mkTs('2026-04-17T18:00:00Z')),
        event('c', mkTs('2026-05-02T09:00:00Z')),
      ];
      const m = [milestone('m1', '2026-04-20')];
      const stats = computeHeroStats({ now, month: '2026-04', items, milestones: m });
      expect(stats.total).toBe(3);
    });

    it('counts private events as not shared', () => {
      const items = [
        event('a', mkTs('2026-04-18T09:00:00Z'), { isPrivate: true }),
        event('b', mkTs('2026-04-19T09:00:00Z'), { isPrivate: false }),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items, milestones: [] });
      expect(stats.shared).toBe(1);
      expect(stats.total).toBe(2);
    });

    it('only counts future events as upcoming', () => {
      const items = [
        event('past', mkTs('2026-04-17T08:00:00Z')),
        event('future', mkTs('2026-04-17T12:00:00Z')),
        event('tomorrow', mkTs('2026-04-18T09:00:00Z')),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items, milestones: [] });
      expect(stats.upcoming).toBe(2);
    });

    it('reports nextInHours to the earliest upcoming event', () => {
      const items = [
        event('later', mkTs('2026-04-17T18:00:00Z')),
        event('sooner', mkTs('2026-04-17T13:00:00Z')),
      ];
      const stats = computeHeroStats({ now, month: '2026-04', items, milestones: [] });
      expect(stats.nextInHours).toBe(3);
    });

    it('returns null nextInHours when no upcoming events', () => {
      const stats = computeHeroStats({ now, month: '2026-04', items: [], milestones: [] });
      expect(stats.nextInHours).toBeNull();
      expect(stats.total).toBe(0);
    });
  });

  describe('buildWeekStrip', () => {
    it('returns 7 days Mon→Sun anchored around selected date', () => {
      // 2026-04-17 is a Friday
      const week = buildWeekStrip({
        selectedDate: '2026-04-17',
        today: '2026-04-17',
        items: [],
        milestones: [],
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
        milestones: [],
      });
      expect(week[0].date).toBe('2026-04-13');
      expect(week[6].date).toBe('2026-04-19');
    });

    it('marks days that have events or milestones', () => {
      const items = [event('a', Date.parse('2026-04-15T09:00:00Z'))];
      const ms = [milestone('m', '2026-04-18')];
      const week = buildWeekStrip({
        selectedDate: '2026-04-17',
        today: '2026-04-17',
        items,
        milestones: ms,
      });
      expect(week.find((d) => d.date === '2026-04-15')?.hasEvent).toBe(true);
      expect(week.find((d) => d.date === '2026-04-18')?.hasEvent).toBe(true);
      expect(week.find((d) => d.date === '2026-04-14')?.hasEvent).toBe(false);
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
  });

  describe('buildTomorrowCard', () => {
    it('prefers a milestone on the next day', () => {
      const items = [event('e', Date.parse('2026-04-18T09:00:00Z'))];
      const ms = [milestone('m', '2026-04-18', 'Anniversary')];
      const card = buildTomorrowCard({ selectedDate: '2026-04-17', items, milestones: ms });
      expect(card?.kind).toBe('milestone');
      expect(card?.id).toBe('m');
    });

    it('falls back to next-day event', () => {
      const items = [event('e', Date.parse('2026-04-18T09:00:00Z'))];
      const card = buildTomorrowCard({ selectedDate: '2026-04-17', items, milestones: [] });
      expect(card?.kind).toBe('event');
      expect(card?.id).toBe('e');
    });

    it('returns null when nothing follows', () => {
      const card = buildTomorrowCard({
        selectedDate: '2026-04-17',
        items: [],
        milestones: [],
      });
      expect(card).toBeNull();
    });

    it('surfaces a future milestone when nothing sits tomorrow', () => {
      const ms = [milestone('m', '2026-04-25', 'Trip')];
      const card = buildTomorrowCard({ selectedDate: '2026-04-17', items: [], milestones: ms });
      expect(card?.kind).toBe('milestone');
      expect(card?.subtitle).toContain('day');
    });
  });

  describe('formatAgendaDayHeader', () => {
    it('renders uppercase WEEKDAY · DD MON', () => {
      expect(formatAgendaDayHeader('2026-04-17')).toBe('FRIDAY · 17 APR');
    });
  });
});
