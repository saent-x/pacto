import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';

// Dev migration helpers (called by migrationsNode actions, which can use Date/random).
export const allReminders = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query('reminders').collect(),
});

export const setReminderTime = internalMutation({
  args: { reminderId: v.id('reminders'), remindAt: v.number(), whenLabel: v.string() },
  handler: async (ctx, { reminderId, remindAt, whenLabel }) => {
    await ctx.db.patch(reminderId, { remindAt, whenLabel });
  },
});
