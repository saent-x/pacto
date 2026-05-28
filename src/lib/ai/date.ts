import { format } from 'date-fns';

export function getLocalAiDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}
