import { format } from 'date-fns';

export type TodayRingSummary = {
  plans: { done: number; total: number };
  focus: { done: number; total: number };
};

type TaskLike = {
  dueDate?: string | null;
  isCompleted?: boolean | null;
  completedAt?: number | null;
};

type ReminderLike = {
  dueAt?: number | null;
  isCompleted?: boolean | null;
  completedAt?: number | null;
};

type PlanLike = {
  targetDate?: string | null;
  status?: string | null;
  isPrivate?: boolean | null;
};

type EventLike = {
  startsAt?: number | null;
  isPrivate?: boolean | null;
};

function localDateKey(value: number | Date) {
  return format(value, 'yyyy-MM-dd');
}

function isDoneStatus(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'done' || normalized === 'completed';
}

function completedToday(item: { completedAt?: number | null }, today: string) {
  return item.completedAt != null && localDateKey(item.completedAt) === today;
}

export function buildTodayRingSummary({
  now,
  plans,
  events,
  tasks,
  reminders,
}: {
  now: number;
  plans: PlanLike[];
  events: EventLike[];
  tasks: TaskLike[];
  reminders: ReminderLike[];
}): TodayRingSummary {
  const today = localDateKey(now);
  let plansDone = 0;
  let plansTotal = 0;
  let focusDone = 0;
  let focusTotal = 0;

  for (const plan of plans) {
    if (plan.isPrivate) continue;
    if ((plan.targetDate ?? null) !== today) continue;
    plansTotal += 1;
    if (isDoneStatus(plan.status)) plansDone += 1;
  }

  for (const event of events) {
    if (event.isPrivate) continue;
    if (event.startsAt == null || localDateKey(event.startsAt) !== today) continue;
    plansTotal += 1;
    if (event.startsAt <= now) plansDone += 1;
  }

  for (const task of tasks) {
    const isTodayItem = (task.dueDate ?? null) === today || completedToday(task, today);
    if (!isTodayItem) continue;
    focusTotal += 1;
    if (task.isCompleted) focusDone += 1;
  }

  for (const reminder of reminders) {
    const dueToday = reminder.dueAt != null && localDateKey(reminder.dueAt) === today;
    if (!dueToday && !completedToday(reminder, today)) continue;
    focusTotal += 1;
    if (reminder.isCompleted) focusDone += 1;
  }

  return {
    plans: { done: plansDone, total: plansTotal },
    focus: { done: focusDone, total: focusTotal },
  };
}
