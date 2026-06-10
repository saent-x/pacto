import { ConvexReactClient } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { fmtTime } from '@/lib/datetime';
import { dueLabelForDate } from '@/lib/taskDueDate';

// Current local date-time as an offset-qualified ISO string. Both engines put
// this in the model prompt so it can ground "tomorrow at 6" into the absolute
// `atIso` that create_reminder needs to actually schedule a notification.
export function localNowIso(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
  );
}

export const deviceTz = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
})();

// Tool definitions advertised to the Realtime model. Mirrors convex/aiNode.ts TOOLS.
export const AI_TOOLS = [
  {
    type: 'function',
    name: 'create_task',
    description: 'Create a task / to-do in the current space.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What needs doing' },
        priority: { type: 'string', enum: ['low', 'med', 'high'] },
        dueIso: {
          type: 'string',
          description:
            'Due date-time as an offset-qualified ISO datetime, e.g. "2026-06-10T18:00:00+02:00" — compute it from the current date and time in your instructions. Omit if the user gave no date.',
        },
      },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'create_reminder',
    description: 'Create a reminder.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        when: { type: 'string', description: 'A natural-language time, e.g. "6pm" or "tomorrow"' },
        atIso: {
          type: 'string',
          description:
            'Absolute reminder time as an offset-qualified ISO datetime, e.g. "2026-06-09T18:00:00+02:00" — compute it from the current date and time in your instructions. Must be in the future: if the named time already passed today, use its next occurrence. Omit if the user gave no time.',
        },
      },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'create_checkin',
    description: 'Log how the user is feeling (a mood check-in).',
    parameters: {
      type: 'object',
      properties: {
        mood: { type: 'string', enum: ['rough', 'low', 'okay', 'steady', 'good', 'great'] },
        note: { type: 'string' },
      },
      required: ['mood'],
    },
  },
  {
    type: 'function',
    name: 'create_timetable',
    description: 'Create a timetable / routine by name.',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'complete_task',
    description: 'Mark a task as done (or toggle it) by its title.',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string', description: 'The task to complete, by name' } },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'complete_reminder',
    description: 'Mark a reminder as done by its title.',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'list_tasks',
    description: "List the space's tasks (open and done).",
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'list_reminders',
    description: "List the space's reminders.",
    parameters: { type: 'object', properties: {} },
  },
] as const;

type Args = Record<string, any>;

const norm = (s: string) => s.toLowerCase().trim();

// Resolve a voice-named item to a record: exact, then contains, then reverse-contains.
function findByTitle<T extends { title?: string }>(items: T[], title: string): T | undefined {
  const t = norm(title);
  return (
    items.find((i) => norm(i.title ?? '') === t) ||
    items.find((i) => norm(i.title ?? '').includes(t)) ||
    items.find((i) => t.includes(norm(i.title ?? '')))
  );
}

// Execute a model tool call against the secured Convex mutations (authed user).
export async function dispatchTool(
  convex: ConvexReactClient,
  spaceId: Id<'spaces'>,
  name: string,
  args: Args,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'create_task': {
      // A real dueAt (not a phantom "Today" label) so the rows derive a live
      // Today/Tomorrow/Overdue label and the due push can actually schedule.
      const dueAt = args.dueIso ? Date.parse(String(args.dueIso)) : NaN;
      await convex.mutation(api.tasks.createTask, {
        spaceId,
        title: String(args.title),
        priority: args.priority,
        ...(Number.isFinite(dueAt) ? { dueAt, dueLabel: dueLabelForDate(new Date(dueAt)) } : {}),
      });
      // "scheduled" = a due push will actually fire; a past dueAt schedules nothing.
      return { ok: true, created: 'task', title: args.title, scheduled: Number.isFinite(dueAt) && dueAt > Date.now() };
    }
    case 'create_reminder': {
      // An offset-qualified atIso parses to an absolute instant, so the reminder
      // can actually notify. Without it the reminder is title-only — the result
      // says so, so the model tells the user no time was set.
      const remindAt = args.atIso ? Date.parse(String(args.atIso)) : NaN;
      if (Number.isFinite(remindAt)) {
        await convex.mutation(api.reminders.createReminder, {
          spaceId,
          title: String(args.title),
          remindAt,
          whenLabel: fmtTime(remindAt),
          tz: deviceTz,
        });
        // A past instant gets no notification job — say so instead of confirming.
        const scheduled = remindAt > Date.now();
        return scheduled
          ? { ok: true, created: 'reminder', title: args.title, scheduled }
          : { ok: true, created: 'reminder', title: args.title, scheduled, note: 'that time already passed — ask the user for a future time' };
      }
      await convex.mutation(api.reminders.createReminder, {
        spaceId,
        title: String(args.title),
        whenLabel: args.when,
      });
      return { ok: true, created: 'reminder', title: args.title, scheduled: false };
    }
    case 'create_checkin':
      await convex.mutation(api.checkins.createCheckin, {
        spaceId,
        mood: String(args.mood),
        note: args.note,
      });
      return { ok: true, created: 'checkin', mood: args.mood };
    case 'create_timetable':
      await convex.mutation(api.timetables.createTimetable, {
        spaceId,
        title: String(args.title),
        items: [],
      });
      return { ok: true, created: 'timetable', title: args.title };
    case 'complete_task': {
      const tasks = await convex.query(api.tasks.listTasks, { spaceId });
      const match = findByTitle(tasks ?? [], String(args.title));
      if (!match) return { ok: false, error: `No task matching "${args.title}"` };
      await convex.mutation(api.tasks.toggleTask, { taskId: match._id });
      return { ok: true, completed: 'task', title: match.title };
    }
    case 'complete_reminder': {
      const reminders = await convex.query(api.reminders.listReminders, { spaceId });
      const match = findByTitle(reminders ?? [], String(args.title));
      if (!match) return { ok: false, error: `No reminder matching "${args.title}"` };
      await convex.mutation(api.reminders.toggleReminder, { reminderId: match._id });
      return { ok: true, completed: 'reminder', title: match.title };
    }
    case 'list_tasks': {
      const tasks = await convex.query(api.tasks.listTasks, { spaceId });
      return { tasks: (tasks ?? []).map((t) => ({ title: t.title, done: t.done })) };
    }
    case 'list_reminders': {
      const reminders = await convex.query(api.reminders.listReminders, { spaceId });
      return { reminders: (reminders ?? []).map((r) => ({ title: r.title, done: r.done, when: r.whenLabel })) };
    }
    default:
      return { ok: false, error: `unknown tool ${name}` };
  }
}
