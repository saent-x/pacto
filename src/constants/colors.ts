const dark = {
  // Accent — warm amber gold, used boldly
  primary: '#D4A054',
  primaryLight: '#2E2620',
  primaryDark: '#B8863C',
  primaryMuted: 'rgba(212, 160, 84, 0.15)',
  primaryVivid: '#E8B86D',

  // Warm dark scale
  ink: '#0F0D0B',
  coal: '#161311',
  night: '#1B1715',
  dark: '#221E1A',
  dim: '#2E2923',
  muted: '#3D362E',
  dusk: '#514840',
  fog: '#7A6E62',
  haze: '#A89A8C',
  cream: '#E8DDD0',
  bone: '#F2EBE2',
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

  // Base
  background: '#0F0D0B',
  screenBackground: '#0F0D0B',
  surface: '#171310',
  card: '#221C18',
  text: '#F2EBE2',
  textSecondary: '#C3B5A6',
  textTertiary: '#938475',
  border: '#3A322B',
  divider: '#342C26',
  white: '#F2EBE2',
  black: '#0F0D0B',

  // Gradients (as arrays for LinearGradient or as overlay colors)
  gradientWarm: ['#2E2117', '#1B1715'],
  gradientGold: ['rgba(212, 160, 84, 0.08)', 'rgba(212, 160, 84, 0)'],
};

const light = {
  primary: '#B85A42',
  primaryLight: '#F0E0D8',
  primaryDark: '#A34E36',
  primaryMuted: 'rgba(184, 90, 66, 0.07)',
  primaryVivid: '#C96B54',

  // Clean warm neutrals
  ink: '#FAFAFA',
  coal: '#F5F5F4',
  night: '#EFEFEC',
  dark: '#E8E5E0',
  dim: '#DDD9D3',
  muted: '#CCC4B8',
  dusk: '#A89A8C',
  fog: '#8A7E72',
  haze: '#6B5F52',
  cream: '#2C2420',
  bone: '#1A1410',
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

  // Clean white base
  background: '#FFFFFF',
  screenBackground: '#FFFFFF',
  surface: '#F7F5F2',
  card: '#F5F2ED',
  text: '#1A1410',
  textSecondary: '#5B4F44',
  textTertiary: '#8D7E70',
  border: '#E0D8CE',
  divider: '#EAE4DC',
  white: '#FFFFFF',
  black: '#1A1410',

  gradientWarm: ['#F7F5F2', '#FFFFFF'],
  gradientGold: ['rgba(184, 90, 66, 0.04)', 'rgba(184, 90, 66, 0)'],
};

export type ColorScheme = {
  [K in keyof typeof dark]: string | readonly string[];
};

export const themes: Record<'dark' | 'light', typeof dark> = { dark, light };

// Default export for convenience — auth screens use this directly
export let Colors: typeof dark = dark;

export function setActiveColors(mode: 'dark' | 'light') {
  Colors = themes[mode];
}
