import type { IconName } from '../components/ui/Icon';
import { alphaColor } from './color';
import { pastels } from './tokens';

export type TemplateKey = 'meals' | 'workout' | 'study' | 'routine' | 'sleep' | 'custom';

export type TimetableTemplate = {
  key: TemplateKey;
  label: string;
  shortLabel: string;
  description: string;
  defaultTitle: string;
  icon: IconName;
  color: string;
  ink: string;
  legacyKeys?: string[];
};

export type TimetableItemOption = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  ink: string;
};

export const GENERAL_TIMETABLE_ITEM_OPTION: TimetableItemOption = {
  key: 'none',
  label: 'None',
  icon: 'bookmark',
  color: pastels.sky,
  ink: pastels.skyInk,
};

export const TEMPLATES: TimetableTemplate[] = [
  {
    key: 'meals',
    label: 'Meal plan',
    shortLabel: 'Meals',
    description: 'Breakfast, lunch, dinner, and snack blocks.',
    defaultTitle: 'Meal plan',
    icon: 'coffee',
    color: pastels.peach,
    ink: pastels.peachInk,
  },
  {
    key: 'workout',
    label: 'Workout plan',
    shortLabel: 'Workout',
    description: 'Training sessions, recovery windows, and movement days.',
    defaultTitle: 'Workout plan',
    icon: 'activity',
    color: pastels.mint,
    ink: pastels.mintInk,
    legacyKeys: ['fitness'],
  },
  {
    key: 'study',
    label: 'Study / work',
    shortLabel: 'Study',
    description: 'Focus blocks, admin time, and project sessions.',
    defaultTitle: 'Study plan',
    icon: 'briefcase',
    color: pastels.sky,
    ink: pastels.skyInk,
  },
  {
    key: 'routine',
    label: 'Ritual',
    shortLabel: 'Ritual',
    description: 'Repeating routines, habits, and daily anchors.',
    defaultTitle: 'Ritual',
    icon: 'sun',
    color: pastels.butter,
    ink: pastels.butterInk,
    legacyKeys: ['weekly'],
  },
  {
    key: 'sleep',
    label: 'Sleep routine',
    shortLabel: 'Sleep',
    description: 'Wind-down steps, bedtime rhythm, and rest cues.',
    defaultTitle: 'Sleep routine',
    icon: 'moon',
    color: pastels.lavender,
    ink: pastels.lavenderInk,
  },
  {
    key: 'custom',
    label: 'Custom',
    shortLabel: 'Custom',
    description: 'A blank timetable for anything else.',
    defaultTitle: 'Custom timetable',
    icon: 'grid',
    color: pastels.rose,
    ink: pastels.roseInk,
  },
];

export function normalizeTemplateKey(raw: unknown, title?: unknown): TemplateKey {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  const direct = TEMPLATES.find((t) => t.key === value);
  if (direct) {
    if (direct.key !== 'custom') return direct.key;
  }
  const legacy = TEMPLATES.find((t) => t.legacyKeys?.includes(value));
  if (legacy) return legacy.key;

  const name = typeof title === 'string' ? title.toLowerCase() : '';
  if (/\b(meal|breakfast|lunch|dinner|snack)\b/.test(name)) return 'meals';
  if (/\b(workout|fitness|training|gym|run|exercise)\b/.test(name)) return 'workout';
  if (/\b(study|work|school|project|focus)\b/.test(name)) return 'study';
  if (/\b(ritual|routine|morning|habit)\b/.test(name)) return 'routine';
  if (/\b(sleep|bedtime|night|wind[- ]?down)\b/.test(name)) return 'sleep';
  return 'custom';
}

export const tmplByKey = (k: TemplateKey | string) => TEMPLATES.find((t) => t.key === normalizeTemplateKey(k)) ?? TEMPLATES[5];

export const TIMETABLE_ITEM_OPTIONS: Record<TemplateKey, TimetableItemOption[]> = {
  meals: [
    { key: 'breakfast', label: 'Breakfast', icon: 'coffee', color: pastels.peach, ink: pastels.peachInk },
    { key: 'lunch', label: 'Lunch', icon: 'feather', color: pastels.mint, ink: pastels.mintInk },
    { key: 'dinner', label: 'Dinner', icon: 'coffee', color: pastels.butter, ink: pastels.butterInk },
    { key: 'snack', label: 'Snack', icon: 'gift', color: pastels.rose, ink: pastels.roseInk },
  ],
  workout: [
    { key: 'strength', label: 'Strength', icon: 'activity', color: pastels.mint, ink: pastels.mintInk },
    { key: 'cardio', label: 'Cardio', icon: 'zap', color: pastels.sky, ink: pastels.skyInk },
    { key: 'mobility', label: 'Mobility', icon: 'repeat', color: pastels.lavender, ink: pastels.lavenderInk },
    { key: 'recovery', label: 'Recovery', icon: 'heart', color: pastels.rose, ink: pastels.roseInk },
  ],
  study: [
    { key: 'focus', label: 'Focus', icon: 'briefcase', color: pastels.sky, ink: pastels.skyInk },
    { key: 'reading', label: 'Reading', icon: 'book', color: pastels.lavender, ink: pastels.lavenderInk },
    { key: 'admin', label: 'Admin', icon: 'clipboard', color: pastels.butter, ink: pastels.butterInk },
    { key: 'break', label: 'Break', icon: 'coffee', color: pastels.mint, ink: pastels.mintInk },
  ],
  routine: [
    { key: 'morning', label: 'Morning', icon: 'sun', color: pastels.butter, ink: pastels.butterInk },
    { key: 'reset', label: 'Reset', icon: 'repeat', color: pastels.sky, ink: pastels.skyInk },
    { key: 'chore', label: 'Chore', icon: 'checkSquare', color: pastels.mint, ink: pastels.mintInk },
    { key: 'reflection', label: 'Reflect', icon: 'feather', color: pastels.rose, ink: pastels.roseInk },
  ],
  sleep: [
    { key: 'wind-down', label: 'Wind down', icon: 'moon', color: pastels.lavender, ink: pastels.lavenderInk },
    { key: 'bedtime', label: 'Bedtime', icon: 'cloud', color: pastels.sky, ink: pastels.skyInk },
    { key: 'wake-up', label: 'Wake up', icon: 'sun', color: pastels.butter, ink: pastels.butterInk },
    { key: 'nap', label: 'Nap', icon: 'heart', color: pastels.mint, ink: pastels.mintInk },
  ],
  custom: [
    { key: 'block', label: 'Block', icon: 'grid', color: pastels.rose, ink: pastels.roseInk },
    { key: 'task', label: 'Task', icon: 'checkSquare', color: pastels.mint, ink: pastels.mintInk },
    { key: 'reminder', label: 'Reminder', icon: 'bell', color: pastels.lavender, ink: pastels.lavenderInk },
    { key: 'note', label: 'Note', icon: 'book', color: pastels.sky, ink: pastels.skyInk },
  ],
};

export function itemOptionsForTemplate(template: TemplateKey | string): TimetableItemOption[] {
  return [GENERAL_TIMETABLE_ITEM_OPTION, ...TIMETABLE_ITEM_OPTIONS[normalizeTemplateKey(template)]];
}

export function itemOptionForTemplate(template: TemplateKey | string, category?: unknown): TimetableItemOption {
  const options = itemOptionsForTemplate(template);
  const key = typeof category === 'string' ? category.toLowerCase().trim() : '';
  return options.find((o) => o.key === key || o.label.toLowerCase() === key) ?? GENERAL_TIMETABLE_ITEM_OPTION;
}

export type ShareKind = 'shared' | 'solo' | 'partner';

export type Who = 'me' | 'partner' | 'both';

export type TimetableItem = {
  id: number | string;
  day: number;
  start: number;
  dur: number;
  title: string;
  icon: IconName;
  color: string;
  ink: string;
  cat: string;
  who: Who;
  star?: boolean;
};

export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const DAYS_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function normalizeWho(value: unknown): Who {
  if (value === 'me' || value === 'both') return value;
  if (value === 'partner' || value === 'sofia') return 'partner';
  return 'both';
}

export function fmtHour(h: number) {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const suffix = whole >= 12 ? 'pm' : 'am';
  const disp = whole === 0 ? 12 : whole > 12 ? whole - 12 : whole;
  return mins ? `${disp}:${String(mins).padStart(2, '0')}${suffix}` : `${disp}${suffix}`;
}

export function shareBadge(share: ShareKind) {
  if (share === 'shared') return { label: 'SHARED', color: pastels.butter, bg: alphaColor(pastels.butter, 0.14) };
  if (share === 'partner') return { label: "PARTNER'S", color: pastels.lavender, bg: alphaColor(pastels.lavender, 0.14) };
  return { label: 'SOLO', color: pastels.sky, bg: alphaColor(pastels.sky, 0.14) };
}
