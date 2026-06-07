import type { IconName } from '@/ui';

export type PriorityKey = 'low' | 'med' | 'high';

// Sheet chip labels (in order) + the icon used wherever priority appears.
export const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'] as const;
export const PRIORITY_ICON: IconName = 'flag';

// Normalize either a sheet label ('Low') or a stored key ('low') to a key.
export const priorityKeyOf = (v?: string): PriorityKey =>
  v === 'High' || v === 'high' ? 'high' : v === 'Low' || v === 'low' ? 'low' : 'med';
export const priorityLabelOf = (key?: string): string =>
  key === 'high' ? 'High' : key === 'low' ? 'Low' : 'Medium';

// Fixed priority hues: red = urgent, amber = medium, grey = low.
const PRIORITY_HEX: Record<PriorityKey, string> = {
  low: '#9AA0A6',
  med: '#D6A23B',
  high: '#C2564A',
};
export const priorityColor = (v?: string): string => PRIORITY_HEX[priorityKeyOf(v)];
