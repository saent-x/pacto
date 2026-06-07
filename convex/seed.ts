import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertMember } from './lib/spaces';

// Populate a space with representative content so screens look alive immediately.
// Idempotent: no-op if the space already has tasks. Mirrors the design's sample data.
export const seedSpace = mutation({
  // tzOffset = client's new Date().getTimezoneOffset() (minutes; UTC+1 → -60).
  // Convex runs in UTC, so without it seeded times render an offset off on-device.
  args: { spaceId: v.id('spaces'), tzOffset: v.optional(v.number()) },
  handler: async (ctx, { spaceId, tzOffset = 0 }) => {
    const { userId } = await assertMember(ctx, spaceId);

    const existing = await ctx.db
      .query('tasks')
      .withIndex('by_space', (q) => q.eq('spaceId', spaceId))
      .first();
    if (existing) return { seeded: false };

    const now = Date.now();
    const day = 86_400_000;
    // Anchor to the user's local day, then set the wall-clock hour in their zone.
    const at = (hour: number, dayOffset = 0) => {
      const d = new Date(now - tzOffset * 60_000 + dayOffset * day);
      d.setUTCHours(hour, 0, 0, 0);
      return d.getTime() + tzOffset * 60_000;
    };

    const base = { spaceId, createdBy: userId };

    await ctx.db.insert('tasks', { ...base, title: 'Draft the studio invoice', done: false, list: 'Work', priority: 'high', dueLabel: 'Today', dueAt: at(20) });
    await ctx.db.insert('tasks', { ...base, title: 'Pick up dry cleaning', done: false, list: 'Errands', priority: 'low', dueLabel: 'Tomorrow', dueAt: at(12, 1) });
    await ctx.db.insert('tasks', { ...base, title: 'Book dentist appointment', done: false, list: 'Health', priority: 'med', dueLabel: 'Next week' });
    await ctx.db.insert('tasks', { ...base, title: 'Water the plants', done: true, list: 'Home', priority: 'low', dueLabel: 'Today' });

    await ctx.db.insert('reminders', { ...base, title: 'Take vitamins', whenLabel: '8:00 AM', repeat: 'Daily', remindAt: at(8), done: false, priority: 'med' });
    await ctx.db.insert('reminders', { ...base, title: 'Water the monstera', whenLabel: '6:30 PM', repeat: 'Every 3 days', remindAt: at(18), done: false, priority: 'med' });
    await ctx.db.insert('reminders', { ...base, title: 'Morning pages', whenLabel: '7:00 AM', repeat: 'Daily', remindAt: at(7), done: true, priority: 'low' });

    await ctx.db.insert('checkins', { ...base, mood: 'good' });
    await ctx.db.insert('checkins', { ...base, mood: 'steady' });

    await ctx.db.insert('timetables', {
      ...base,
      title: 'Weekday rhythm',
      share: 'Solo',
      days: 5,
      items: [
        { time: '7:00', title: 'Morning pages', dur: '30m' },
        { time: '8:00', title: 'Deep work', dur: '2h' },
        { time: '13:00', title: 'Lunch & walk', dur: '1h' },
        { time: '18:00', title: 'Studio time', dur: '2h' },
        { time: '22:00', title: 'Wind-down', dur: '45m' },
      ],
    });

    await ctx.db.insert('calendarEvents', { ...base, title: 'Studio standup', loc: 'Video call', startsAt: at(9) });
    await ctx.db.insert('calendarEvents', { ...base, title: 'Lunch with a friend', loc: 'Café Lume', startsAt: at(13) });
    await ctx.db.insert('calendarEvents', { ...base, title: 'Pottery class', loc: 'Eastside Makers', startsAt: at(18) });

    return { seeded: true };
  },
});
