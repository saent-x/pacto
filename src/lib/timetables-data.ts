import type { IconName } from '../components/ui/Icon';
import { alphaColor } from './color';
import { pastels } from './tokens';

export type TemplateKey = 'meals' | 'workout' | 'study' | 'routine' | 'sleep' | 'custom';

export type TimetableTemplate = {
  key: TemplateKey;
  label: string;
  icon: IconName;
  color: string;
  ink: string;
};

export const TEMPLATES: TimetableTemplate[] = [
  { key: 'meals', label: 'Meal plan', icon: 'coffee', color: pastels.peach, ink: pastels.peachInk },
  { key: 'workout', label: 'Workout', icon: 'activity', color: pastels.mint, ink: pastels.mintInk },
  { key: 'study', label: 'Study / work', icon: 'briefcase', color: pastels.sky, ink: pastels.skyInk },
  { key: 'routine', label: 'Morning ritual', icon: 'sun', color: pastels.butter, ink: pastels.butterInk },
  { key: 'sleep', label: 'Sleep routine', icon: 'moon', color: pastels.lavender, ink: pastels.lavenderInk },
  { key: 'custom', label: 'Blank', icon: 'grid', color: pastels.rose, ink: pastels.roseInk },
];

export const tmplByKey = (k: TemplateKey) => TEMPLATES.find((t) => t.key === k) ?? TEMPLATES[5];

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
