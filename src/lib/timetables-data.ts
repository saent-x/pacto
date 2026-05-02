import type { IconName } from '../components/ui/Icon';

export type TemplateKey = 'meals' | 'workout' | 'study' | 'routine' | 'sleep' | 'custom';

export type TimetableTemplate = {
  key: TemplateKey;
  label: string;
  icon: IconName;
  color: string;
  ink: string;
  sample: string;
};

export const TEMPLATES: TimetableTemplate[] = [
  { key: 'meals', label: 'Meal plan', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', sample: 'Breakfast · Lunch · Dinner' },
  { key: 'workout', label: 'Workout', icon: 'activity', color: '#A8D8B9', ink: '#0F2C1A', sample: 'Push · Pull · Legs · Rest' },
  { key: 'study', label: 'Study / work', icon: 'briefcase', color: '#9FC4DC', ink: '#0E2230', sample: 'Deep work · Meetings · Break' },
  { key: 'routine', label: 'Morning ritual', icon: 'sun', color: '#F2D86A', ink: '#3A2E08', sample: 'Stretch · Journal · Coffee' },
  { key: 'sleep', label: 'Sleep routine', icon: 'moon', color: '#B8A8E8', ink: '#1F1635', sample: 'Wind down · Read · Lights out' },
  { key: 'custom', label: 'Blank', icon: 'grid', color: '#D89BA8', ink: '#3A1520', sample: 'Start from zero' },
];

export const tmplByKey = (k: TemplateKey) => TEMPLATES.find((t) => t.key === k) ?? TEMPLATES[5];

export type ShareKind = 'shared' | 'solo' | 'partner';

export type Who = 'me' | 'sofia' | 'both';

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

export function fmtHour(h: number) {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const suffix = whole >= 12 ? 'pm' : 'am';
  const disp = whole === 0 ? 12 : whole > 12 ? whole - 12 : whole;
  return mins ? `${disp}:${String(mins).padStart(2, '0')}${suffix}` : `${disp}${suffix}`;
}

export function shareBadge(share: ShareKind) {
  if (share === 'shared') return { label: 'SHARED', color: '#E4B24A', bg: 'rgba(228,178,74,0.14)' };
  if (share === 'partner') return { label: "PARTNER'S", color: '#B8A8E8', bg: 'rgba(184,168,232,0.14)' };
  return { label: 'SOLO', color: '#9FC4DC', bg: 'rgba(159,196,220,0.14)' };
}
