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

export type Timetable = {
  id: number;
  title: string;
  template: TemplateKey;
  share: ShareKind;
  items: number;
  next: string;
  updated: string;
};

export const DEMO_TIMETABLES: Timetable[] = [
  { id: 1, title: 'Our meals this week', template: 'meals', share: 'shared', items: 21, next: 'Today · 7pm · Risotto', updated: '2h ago' },
  { id: 2, title: 'Push / Pull / Legs', template: 'workout', share: 'solo', items: 12, next: 'Tomorrow · 7am · Pull', updated: 'yesterday' },
  { id: 3, title: "Sofia · deep work", template: 'study', share: 'partner', items: 18, next: 'Today · 10am · Writing', updated: '3d ago' },
  { id: 4, title: 'Morning ritual', template: 'routine', share: 'solo', items: 5, next: 'Every day · 6:30am', updated: '1w ago' },
];

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

export const DEMO_ITEMS: TimetableItem[] = [
  { id: 1, day: 0, start: 7, dur: 1, title: 'Oat porridge + berries', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id: 2, day: 0, start: 13, dur: 1, title: 'Quinoa bowl · avocado', icon: 'feather', color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch', who: 'me' },
  { id: 3, day: 0, start: 19, dur: 1.5, title: 'Risotto al limone', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both' },
  { id: 4, day: 1, start: 7, dur: 1, title: 'Greek yogurt · honey', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'me' },
  { id: 5, day: 1, start: 12.5, dur: 1, title: 'Caprese sandwich', icon: 'feather', color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch', who: 'sofia' },
  { id: 6, day: 1, start: 19.5, dur: 1.5, title: 'Miso-glazed salmon', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both' },
  { id: 7, day: 2, start: 7.5, dur: 0.75, title: 'Espresso + toast', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'me' },
  { id: 8, day: 2, start: 13, dur: 1, title: 'Leftover salmon', icon: 'feather', color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch', who: 'me' },
  { id: 9, day: 2, start: 19, dur: 1.75, title: 'Date night · Cacio e pepe', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both', star: true },
  { id: 10, day: 3, start: 7, dur: 1, title: 'Smoothie bowl', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id: 11, day: 3, start: 13, dur: 1, title: 'Soup + focaccia', icon: 'feather', color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch', who: 'sofia' },
  { id: 12, day: 3, start: 19.5, dur: 1.5, title: 'Orecchiette al pesto', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both' },
  { id: 13, day: 4, start: 7, dur: 1, title: 'Scrambled eggs', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'me' },
  { id: 14, day: 4, start: 13, dur: 1, title: 'Farro salad', icon: 'feather', color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch', who: 'me' },
  { id: 15, day: 4, start: 20, dur: 2, title: 'Pizza night · homemade', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both', star: true },
  { id: 16, day: 5, start: 9, dur: 1.5, title: 'Brunch · ricotta pancakes', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id: 17, day: 5, start: 19.5, dur: 2, title: 'Osso buco', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both' },
  { id: 18, day: 6, start: 9.5, dur: 1.5, title: 'Frittata + espresso', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id: 19, day: 6, start: 13.5, dur: 1.5, title: 'Long Sunday lunch', icon: 'coffee', color: '#F2D86A', ink: '#3A2E08', cat: 'Lunch', who: 'both' },
];

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
  if (share === 'partner') return { label: "SOFIA'S", color: '#B8A8E8', bg: 'rgba(184,168,232,0.14)' };
  return { label: 'SOLO', color: '#9FC4DC', bg: 'rgba(159,196,220,0.14)' };
}
