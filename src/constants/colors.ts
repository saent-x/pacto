const dark = {
  // Accent — Warm Block gold (brand anchor)
  primary: '#E4B24A',
  primaryLight: '#2E2620',
  primaryDark: '#C99836',
  primaryMuted: 'rgba(228, 178, 74, 0.14)',
  primaryVivid: '#E8B86D',

  // Warm Block scale (prototype tokens)
  ink: '#0E0B0A',
  coal: '#161210',
  card: '#1D1815',
  cardHi: '#262019',
  line: '#2B241E',
  lineHi: '#3A322A',
  bone: '#F5EEE3',
  mist: '#B3A89A',
  fog: '#80746A',
  ash: '#5A5048',
  gold: '#E4B24A',
  goldDim: '#C99836',
  goldSoft: 'rgba(228, 178, 74, 0.14)',

  // Legacy warm scale aliases (kept for back-compat)
  night: '#1B1715',
  dark: '#221E1A',
  dim: '#2E2923',
  muted: '#3D362E',
  dusk: '#514840',
  haze: '#B3A89A',
  cream: '#E8DDD0',
  parchment: '#FAF6F1',

  // Semantic
  success: '#8AAF7B',
  successLight: 'rgba(138, 175, 123, 0.12)',
  warning: '#D4A054',
  warningLight: 'rgba(212, 160, 84, 0.12)',
  error: '#C96B5A',
  errorLight: 'rgba(201, 107, 90, 0.12)',
  info: '#7BA0AF',
  infoLight: 'rgba(123, 160, 175, 0.12)',

  // Feature accents
  reminders: '#9B8EC4',
  remindersLight: 'rgba(155, 142, 196, 0.12)',
  tasks: '#7BA08A',
  tasksLight: 'rgba(123, 160, 138, 0.12)',
  journal: '#C4977A',
  journalLight: 'rgba(196, 151, 122, 0.12)',
  wishlists: '#D4A054',
  wishlistsLight: 'rgba(212, 160, 84, 0.12)',
  plans: '#8AAF7B',
  plansLight: 'rgba(138, 175, 123, 0.12)',
  checklists: '#7BA0AF',
  checklistsLight: 'rgba(123, 160, 175, 0.12)',
  expenses: '#B08090',
  expensesLight: 'rgba(176, 128, 144, 0.12)',
  milestones: '#C4977A',
  milestonesLight: 'rgba(196, 151, 122, 0.12)',
  mood: '#9B8EC4',
  moodLight: 'rgba(155, 142, 196, 0.12)',

  // Base (aliases of Warm Block scale above)
  background: '#0E0B0A',
  screenBackground: '#0E0B0A',
  surface: '#161210',
  text: '#F5EEE3',
  textSecondary: '#B3A89A',
  textTertiary: '#80746A',
  border: '#2B241E',
  divider: '#3A322A',
  white: '#F5EEE3',
  black: '#0E0B0A',

  // Gradients (as arrays for LinearGradient or as overlay colors)
  gradientWarm: ['#2E2117', '#161210'],
  gradientGold: ['rgba(228, 178, 74, 0.10)', 'rgba(228, 178, 74, 0)'],
};

const light = {
  // Warm Block light — deeper gold for cream contrast
  primary: '#B8872E',
  primaryLight: '#F0E0D8',
  primaryDark: '#956912',
  primaryMuted: 'rgba(184, 135, 46, 0.12)',
  primaryVivid: '#C99836',

  // Warm Block cream scale (prototype lightTokens)
  ink: '#F5EEE3',
  coal: '#EDE5D8',
  card: '#F9F3E8',
  cardHi: '#FFF9EE',
  line: '#D9CFBE',
  lineHi: '#C5B8A2',
  bone: '#1F1611',
  mist: '#5A4B3E',
  fog: '#86766A',
  ash: '#A59684',
  gold: '#B8872E',
  goldDim: '#956912',
  goldSoft: 'rgba(184, 135, 46, 0.12)',

  // Legacy scale aliases
  night: '#EFEFEC',
  dark: '#E8E5E0',
  dim: '#DDD9D3',
  muted: '#CCC4B8',
  dusk: '#A89A8C',
  haze: '#5A4B3E',
  cream: '#2C2420',
  parchment: '#0F0D0B',

  success: '#5A7A50',
  successLight: 'rgba(90, 122, 80, 0.10)',
  warning: '#A87A38',
  warningLight: 'rgba(168, 122, 56, 0.10)',
  error: '#A84A3A',
  errorLight: 'rgba(168, 74, 58, 0.10)',
  info: '#5A7A8A',
  infoLight: 'rgba(90, 122, 138, 0.10)',

  reminders: '#6A5E9A',
  remindersLight: 'rgba(106, 94, 154, 0.10)',
  tasks: '#5A7A6A',
  tasksLight: 'rgba(90, 122, 106, 0.10)',
  journal: '#A87258',
  journalLight: 'rgba(168, 114, 88, 0.10)',
  wishlists: '#A87A38',
  wishlistsLight: 'rgba(168, 122, 56, 0.10)',
  plans: '#5A7A50',
  plansLight: 'rgba(90, 122, 80, 0.10)',
  checklists: '#5A7A8A',
  checklistsLight: 'rgba(90, 122, 138, 0.10)',
  expenses: '#8A5A6A',
  expensesLight: 'rgba(138, 90, 106, 0.10)',
  milestones: '#A87258',
  milestonesLight: 'rgba(168, 114, 88, 0.10)',
  mood: '#6A5E9A',
  moodLight: 'rgba(106, 94, 154, 0.10)',

  // Warm cream base (aliases of Warm Block scale above)
  background: '#F5EEE3',
  screenBackground: '#F5EEE3',
  surface: '#EDE5D8',
  text: '#1F1611',
  textSecondary: '#5A4B3E',
  textTertiary: '#86766A',
  border: '#D9CFBE',
  divider: '#C5B8A2',
  white: '#FFFFFF',
  black: '#1A1410',

  gradientWarm: ['#F7F5F2', '#FFFFFF'],
  gradientGold: ['rgba(184, 90, 66, 0.04)', 'rgba(184, 90, 66, 0)'],
};

export type ColorScheme = {
  [K in keyof typeof dark]: string | readonly string[];
};

import { deepRose, sageWalnut, midnightHoney } from './colors-alternatives';

export type PaletteKey = 'classic' | 'deepRose' | 'sageWalnut' | 'midnightHoney';

export const PALETTE_OPTIONS: { value: PaletteKey; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'midnightHoney', label: 'Midnight' },
  { value: 'deepRose', label: 'Rose' },
  { value: 'sageWalnut', label: 'Sage' },
];

const palettes: Record<PaletteKey, { dark: typeof dark; light: typeof light }> = {
  classic: { dark, light },
  deepRose: { dark: deepRose.dark as typeof dark, light: deepRose.light as typeof light },
  sageWalnut: { dark: sageWalnut.dark as typeof dark, light: sageWalnut.light as typeof light },
  midnightHoney: { dark: midnightHoney.dark as typeof dark, light: midnightHoney.light as typeof light },
};

let activePaletteKey: PaletteKey = 'classic';

export const themes: Record<'dark' | 'light', typeof dark> = {
  dark: palettes.classic.dark,
  light: palettes.classic.light,
};

// Default export for convenience — auth screens use this directly
export let Colors: typeof dark = palettes.classic.dark;

export function setActivePalette(key: PaletteKey) {
  activePaletteKey = key;
  const p = palettes[key];
  themes.dark = p.dark;
  themes.light = p.light;
}

export function getActivePalette(): PaletteKey {
  return activePaletteKey;
}

export function setActiveColors(mode: 'dark' | 'light') {
  Colors = themes[mode];
}
