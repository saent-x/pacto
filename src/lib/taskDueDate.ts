export type DueOption = 'No date' | 'Today' | 'Tomorrow' | 'Pick date';

export type TaskDuePayload = {
  dueAt?: number;
  dueLabel?: string;
};

export type TaskDueUpdatePayload = TaskDuePayload & {
  clearDue?: boolean;
};

const DUE_HOUR = 18;

const atDueHour = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(DUE_HOUR, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const dueLabelForDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const dueDateFromOption = (option: DueOption, base: Date): Date => {
  switch (option) {
    case 'Today':
      return atDueHour(base);
    case 'Tomorrow':
      return atDueHour(addDays(base, 1));
    case 'Pick date':
      return atDueHour(base);
    case 'No date':
      return atDueHour(base);
  }
};

export const dueLabelFromOption = (option: DueOption, date: Date): string | undefined => {
  switch (option) {
    case 'Today':
      return 'Today';
    case 'Tomorrow':
      return 'Tomorrow';
    case 'Pick date':
      return dueLabelForDate(date);
    case 'No date':
      return undefined;
  }
};

export const optionalDuePayload = (option: DueOption, base: Date): TaskDuePayload => {
  if (option === 'No date') return {};
  const dueDate = dueDateFromOption(option, base);
  return { dueAt: dueDate.getTime(), dueLabel: dueLabelFromOption(option, dueDate) };
};

export const optionalDueUpdatePayload = ({
  editing,
  dueChanged,
  option,
  base,
}: {
  editing: boolean;
  dueChanged: boolean;
  option: DueOption;
  base: Date;
}): TaskDueUpdatePayload => {
  if (editing && !dueChanged) return {};
  if (option === 'No date') return editing ? { clearDue: true } : {};
  return optionalDuePayload(option, base);
};

export const initialDueOption = (dueLabel?: string): DueOption => {
  if (!dueLabel) return 'No date';
  if (dueLabel === 'Today' || dueLabel === 'Tomorrow') return dueLabel;
  return 'Pick date';
};
