import { v } from 'convex/values';
import {
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
  ActionCtx,
} from './_generated/server';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';
import { Id } from './_generated/dataModel';

// ---------------------------------------------------------------------------
// Public: device push-token registration (one row per device per user)
// ---------------------------------------------------------------------------

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.optional(v.string()),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, { token, platform, deviceName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null; // not signed in — nothing to store
    const existing = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    const fields = { userId, token, platform, deviceName, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('pushTokens', fields);
    }
    return null;
  },
});

export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const rows = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return null;
  },
});

// Internal: drop a token Expo reports as unregistered (uninstall / disabled).
export const removeTokenInternal = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const rows = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Delivery: re-validate the item at fire time, then send via Expo Push.
// Returns null when the item must NOT notify (deleted, completed, or the
// stored time was changed/cleared since the job was scheduled).
// ---------------------------------------------------------------------------

type Deliverable = { title: string; route: string; repeat: string | null; tokens: string[] };

async function tokensForUser(
  ctx: { db: any },
  userId: Id<'users'>,
): Promise<string[]> {
  const rows = await ctx.db
    .query('pushTokens')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .take(20);
  return rows.map((r: any) => r.token);
}

export const prepareReminderDelivery = internalQuery({
  args: { reminderId: v.id('reminders'), expectedRemindAt: v.number() },
  handler: async (ctx, { reminderId, expectedRemindAt }): Promise<Deliverable | null> => {
    const r = await ctx.db.get(reminderId);
    if (!r) return null; // deleted — never notify
    if (r.done) return null; // completed — never notify
    if (r.remindAt !== expectedRemindAt) return null; // edited/cleared — stale job
    const recipient = r.assigneeUserId ?? r.createdBy;
    return {
      title: r.title,
      route: `/new/reminder?id=${r._id}`,
      repeat: r.repeat ?? null,
      tokens: await tokensForUser(ctx, recipient),
    };
  },
});

export const prepareTaskDelivery = internalQuery({
  args: { taskId: v.id('tasks'), expectedDueAt: v.number() },
  handler: async (ctx, { taskId, expectedDueAt }): Promise<Deliverable | null> => {
    const t = await ctx.db.get(taskId);
    if (!t) return null;
    if (t.done) return null;
    if (t.dueAt !== expectedDueAt) return null;
    const recipient = t.assigneeUserId ?? t.createdBy;
    return {
      title: t.title,
      route: `/new/task?id=${t._id}`,
      repeat: null,
      tokens: await tokensForUser(ctx, recipient),
    };
  },
});

export const deliverReminder = internalAction({
  args: { reminderId: v.id('reminders'), expectedRemindAt: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.notifications.prepareReminderDelivery, args);
    if (!job) return null;
    await sendExpoPush(ctx, job.tokens, {
      title: 'Reminder',
      body: job.title,
      data: { route: job.route },
    });
    // Re-arm recurring reminders for their next occurrence.
    if (job.repeat && job.repeat !== 'Once') {
      await ctx.runMutation(internal.notifications.rearmReminder, {
        reminderId: args.reminderId,
      });
    }
    return null;
  },
});

export const deliverTask = internalAction({
  args: { taskId: v.id('tasks'), expectedDueAt: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.notifications.prepareTaskDelivery, args);
    if (!job) return null;
    await sendExpoPush(ctx, job.tokens, {
      title: 'Task due',
      body: job.title,
      data: { route: job.route },
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Recurrence: schedule the next occurrence of a repeating reminder.
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

/** Next fire time for a repeat rule, or null for one-shot / unknown rules. */
function nextOccurrence(base: number, repeat: string): number | null {
  switch (repeat) {
    case 'Daily':
      return base + DAY;
    case 'Weekly':
      return base + 7 * DAY;
    case 'Weekdays': {
      let next = base + DAY;
      let day = new Date(next).getUTCDay(); // 0 Sun .. 6 Sat
      if (day === 6) next += 2 * DAY; // Sat -> Mon
      else if (day === 0) next += DAY; // Sun -> Mon
      return next;
    }
    case 'Monthly': {
      const d = new Date(base);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d.getTime();
    }
    default:
      return null;
  }
}

export const rearmReminder = internalMutation({
  args: { reminderId: v.id('reminders') },
  handler: async (ctx, { reminderId }) => {
    const r = await ctx.db.get(reminderId);
    if (!r || r.done || typeof r.remindAt !== 'number' || !r.repeat) return null;
    const next = nextOccurrence(r.remindAt, r.repeat);
    if (next === null) {
      await ctx.db.patch(reminderId, { notifyJobId: undefined });
      return null;
    }
    const jobId = await ctx.scheduler.runAt(next, internal.notifications.deliverReminder, {
      reminderId,
      expectedRemindAt: next,
    });
    await ctx.db.patch(reminderId, { remindAt: next, notifyJobId: jobId });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Expo Push transport
// ---------------------------------------------------------------------------

type PushMessage = { title: string; body: string; data?: Record<string, unknown> };

async function sendExpoPush(ctx: ActionCtx, tokens: string[], message: PushMessage) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));
  let json: any = null;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    json = await res.json();
  } catch (e) {
    console.error('Expo push send failed', e);
    return;
  }
  const tickets = json?.data;
  if (!Array.isArray(tickets)) return;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      await ctx.runMutation(internal.notifications.removeTokenInternal, { token: tokens[i] });
    }
  }
}
