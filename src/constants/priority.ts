import type { IconName } from '@/ui';

type PriorityKey = 'low' | 'med' | 'high';

// Sheet chip labels (in order) + the icon used wherever priority appears.
export const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'] as const;
export const PRIORITY_ICON: IconName = 'flag';

// Normalize either a sheet label ('Low') or a stored key ('low') to a key.
const priorityKeyOf = (v?: string): PriorityKey =>
  v === 'High' || v === 'high' ? 'high' : v === 'Low' || v === 'low' ? 'low' : 'med';
// Distinguishes "never set" from an explicit choice, so rows can render unset
// priority as neutral instead of a phantom Medium flag.
export const priorityKeyOrNull = (v?: string): PriorityKey | null =>
  v == null || v === '' ? null : priorityKeyOf(v);

// Priority hues per theme: red = urgent, amber = medium, grey = low. The light
// set is darkened to clear the 3:1 icon floor on the cloud background; the dark
// set keeps the brighter fills that read on the ink canvas.
const PRIORITY_HEX: Record<'light' | 'dark', Record<PriorityKey, string>> = {
  light: { low: '#787E86', med: '#A87718', high: '#B84F43' },
  dark: { low: '#9AA0A6', med: '#D6A23B', high: '#E07A5A' },
};
export const priorityColor = (v?: string, isDark = false): string =>
  PRIORITY_HEX[isDark ? 'dark' : 'light'][priorityKeyOf(v)];
