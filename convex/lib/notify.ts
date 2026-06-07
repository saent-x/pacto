import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';

// Helpers that keep a reminder/task's scheduled push-notification job in sync
// with its current state. Called from the reminder/task CRUD mutations so that:
//   - creating/editing an item with a future time schedules a delivery job,
//   - completing or clearing the time cancels it,
//   - deleting cancels it (deleted items must never notify).
// The delivery action ALSO re-checks the item at fire time (see notifications.ts),
// so a stale job can never notify a deleted/completed item — this is belt+suspenders.

/** Cancel a previously scheduled job, ignoring jobs that already ran/are unknown. */
export async function cancelJob(ctx: MutationCtx, jobId?: string | null) {
  if (!jobId) return;
  try {
    await ctx.scheduler.cancel(jobId as Id<'_scheduled_functions'>);
  } catch {
    // Already fired or no longer exists — nothing to cancel.
  }
}

/** Reconcile the scheduled notification for a reminder against its current row. */
export async function syncReminderNotification(ctx: MutationCtx, reminderId: Id<'reminders'>) {
  const r = await ctx.db.get(reminderId);
  if (!r) return;
  await cancelJob(ctx, r.notifyJobId);
  let jobId: string | undefined;
  if (!r.done && typeof r.remindAt === 'number' && r.remindAt > Date.now()) {
    jobId = await ctx.scheduler.runAt(r.remindAt, internal.notifications.deliverReminder, {
      reminderId,
      expectedRemindAt: r.remindAt,
    });
  }
  await ctx.db.patch(reminderId, { notifyJobId: jobId });
}

/** Reconcile the scheduled notification for a task against its current row. */
export async function syncTaskNotification(ctx: MutationCtx, taskId: Id<'tasks'>) {
  const t = await ctx.db.get(taskId);
  if (!t) return;
  await cancelJob(ctx, t.notifyJobId);
  let jobId: string | undefined;
  if (!t.done && typeof t.dueAt === 'number' && t.dueAt > Date.now()) {
    jobId = await ctx.scheduler.runAt(t.dueAt, internal.notifications.deliverTask, {
      taskId,
      expectedDueAt: t.dueAt,
    });
  }
  await ctx.db.patch(taskId, { notifyJobId: jobId });
}
