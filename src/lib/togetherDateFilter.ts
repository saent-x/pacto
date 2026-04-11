import { format } from 'date-fns';

export function toLocalDateKey(timestamp: number) {
  return format(new Date(timestamp), 'yyyy-MM-dd');
}

export function matchesSelectedDate(
  itemDate: string | null | undefined,
  selectedDate: string | null,
) {
  if (!selectedDate) return true;
  return itemDate === selectedDate;
}

export function matchesSelectedDateForTimestamp(
  timestamp: number,
  selectedDate: string | null,
) {
  if (!selectedDate) return true;
  return toLocalDateKey(timestamp) === selectedDate;
}
