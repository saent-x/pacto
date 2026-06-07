'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

// One-off: give existing reminders that have no time a random one so they render.
// Internal-only — it bulk-writes across EVERY space in the deployment, so it must
// not be a public (client-reachable) action. Run with:
//   npx convex run migrationsNode:backfillReminderTimes
export const backfillReminderTimes = internalAction({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.runQuery(internal.migrations.allReminders, {});
    let updated = 0;
    for (const r of all) {
      if (r.remindAt) continue;
      const hour = 7 + Math.floor(Math.random() * 13); // 7..19
      const min = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      const d = new Date();
      d.setHours(hour, min, 0, 0);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = ((hour + 11) % 12) + 1;
      const whenLabel = `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
      await ctx.runMutation(internal.migrations.setReminderTime, {
        reminderId: r._id,
        remindAt: d.getTime(),
        whenLabel,
      });
      updated++;
    }
    return { updated };
  },
});
