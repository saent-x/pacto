// Pacto WARM CALM palette
// Source: /tmp/pacto-design/coupl-design-ii/project/index.html (:root + [data-theme="dark"])
// OKLCH values converted to hex for React Native (which doesn't accept oklch() in styles).
//
// Three accent hues sharing chroma 0.13 / lightness 0.68:
//   - accent   = terracotta-rose (mine / Maya / primary)
//   - accent2  = sage             (partner / Jordan / secondary)
//   - accent3  = honey            (shared / tertiary)
//
// Legacy keys (gold, bone, coal, etc.) are kept and re-pointed at the new tokens so existing
// screens render immediately under the new palette while Phase 6+7+8+10 rebuild them.

// ─── Tokens (light) ──────────────────────────────────────────────
const L_BG = '#FAF8F2';
const L_BG_SOFT = '#F4F0E5';
const L_BG_CARD = '#FFFFFF';
const L_INK = '#2A241B';
const L_INK_2 = '#5C5345';
const L_INK_3 = '#918875';
const L_LINE = '#E8E2D4';
const L_LINE_2 = '#DBD3C0';
const L_ACCENT = '#C7755A';
const L_ACCENT_2 = '#6FB3A2';
const L_ACCENT_3 = '#C8AE73';
const L_ACCENT_SOFT = '#F5DDD3';
const L_ACCENT_2_SOFT = '#DCEDE7';
const L_ACCENT_3_SOFT = '#EEE4C8';

// ─── Tokens (dark) ───────────────────────────────────────────────
const D_BG = '#2A2620';
const D_BG_SOFT = '#322D26';
const D_BG_CARD = '#39322B';
const D_INK = '#F2EEE5';
const D_INK_2 = '#C2BAA9';
const D_INK_3 = '#847A6A';
const D_LINE = '#4D4537';
const D_LINE_2 = '#5B5141';
const D_ACCENT = '#D08B6F';
const D_ACCENT_2 = '#7FBFAF';
const D_ACCENT_3 = '#D2BC85';
const D_ACCENT_SOFT = '#4D352B';
const D_ACCENT_2_SOFT = '#2C443D';
const D_ACCENT_3_SOFT = '#4A4128';

const dark = {
  // ─── New WARM CALM tokens ────────────────────────────────────
  bg: D_BG,
  bgSoft: D_BG_SOFT,
  bgCard: D_BG_CARD,
  inkColor: D_INK,
  ink2: D_INK_2,
  ink3: D_INK_3,
  lineColor: D_LINE,
  line2: D_LINE_2,
  accent: D_ACCENT,
  accent2: D_ACCENT_2,
  accent3: D_ACCENT_3,
  accentSoft: D_ACCENT_SOFT,
  accent2Soft: D_ACCENT_2_SOFT,
  accent3Soft: D_ACCENT_3_SOFT,

  // ─── Legacy aliases (re-pointed) ─────────────────────────────
  primary: D_ACCENT,
  primaryLight: D_ACCENT_SOFT,
  primaryDark: '#A3654C',
  primaryMuted: 'rgba(208, 139, 111, 0.16)',
  primaryVivid: '#DCA78F',

  ink: D_BG,
  coal: D_BG_SOFT,
  card: D_BG_CARD,
  cardHi: '#3F3830',
  line: D_LINE,
  lineHi: D_LINE_2,
  bone: D_INK,
  mist: D_INK_2,
  fog: D_INK_3,
  ash: '#6E6555',
  gold: D_ACCENT,
  goldDim: '#A3654C',
  goldSoft: 'rgba(208, 139, 111, 0.16)',

  night: D_BG_SOFT,
  dark: D_BG_CARD,
  dim: '#3F3830',
  muted: D_LINE,
  dusk: D_LINE_2,
  haze: D_INK_2,
  cream: D_INK,
  parchment: D_INK,

  success: '#8AAF7B',
  successLight: 'rgba(138, 175, 123, 0.14)',
  warning: '#D4A054',
  warningLight: 'rgba(212, 160, 84, 0.14)',
  error: '#C96B5A',
  errorLight: 'rgba(201, 107, 90, 0.14)',
  info: '#7BA0AF',
  infoLight: 'rgba(123, 160, 175, 0.14)',

  reminders: '#9B8EC4',
  remindersLight: 'rgba(155, 142, 196, 0.14)',
  tasks: '#7BA08A',
  tasksLight: 'rgba(123, 160, 138, 0.14)',
  journal: '#C4977A',
  journalLight: 'rgba(196, 151, 122, 0.14)',
  wishlists: '#D4A054',
  wishlistsLight: 'rgba(212, 160, 84, 0.14)',
  plans: '#8AAF7B',
  plansLight: 'rgba(138, 175, 123, 0.14)',
  checklists: '#7BA0AF',
  checklistsLight: 'rgba(123, 160, 175, 0.14)',
  expenses: '#B08090',
  expensesLight: 'rgba(176, 128, 144, 0.14)',
  milestones: '#C4977A',
  milestonesLight: 'rgba(196, 151, 122, 0.14)',
  mood: '#9B8EC4',
  moodLight: 'rgba(155, 142, 196, 0.14)',

  background: D_BG,
  screenBackground: D_BG,
  surface: D_BG_SOFT,
  text: D_INK,
  textSecondary: D_INK_2,
  textTertiary: D_INK_3,
  border: D_LINE,
  divider: D_LINE_2,
  white: D_INK,
  black: D_BG,

  gradientWarm: [D_BG_SOFT, D_BG] as readonly string[],
  gradientGold: ['rgba(208, 139, 111, 0.10)', 'rgba(208, 139, 111, 0)'] as readonly string[],
};

const light = {
  // ─── New WARM CALM tokens ────────────────────────────────────
  bg: L_BG,
  bgSoft: L_BG_SOFT,
  bgCard: L_BG_CARD,
  inkColor: L_INK,
  ink2: L_INK_2,
  ink3: L_INK_3,
  lineColor: L_LINE,
  line2: L_LINE_2,
  accent: L_ACCENT,
  accent2: L_ACCENT_2,
  accent3: L_ACCENT_3,
  accentSoft: L_ACCENT_SOFT,
  accent2Soft: L_ACCENT_2_SOFT,
  accent3Soft: L_ACCENT_3_SOFT,

  // ─── Legacy aliases (re-pointed) ─────────────────────────────
  primary: L_ACCENT,
  primaryLight: L_ACCENT_SOFT,
  primaryDark: '#9F5A40',
  primaryMuted: 'rgba(199, 117, 90, 0.14)',
  primaryVivid: '#B86846',

  ink: L_BG,
  coal: L_BG_SOFT,
  card: L_BG_CARD,
  cardHi: '#FFFDF7',
  line: L_LINE,
  lineHi: L_LINE_2,
  bone: L_INK,
  mist: L_INK_2,
  fog: L_INK_3,
  ash: '#A89E89',
  gold: L_ACCENT,
  goldDim: '#9F5A40',
  goldSoft: 'rgba(199, 117, 90, 0.14)',

  night: L_BG_SOFT,
  dark: L_BG_CARD,
  dim: '#FFFDF7',
  muted: L_LINE,
  dusk: L_LINE_2,
  haze: L_INK_2,
  cream: L_INK,
  parchment: L_INK,

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

  background: L_BG,
  screenBackground: L_BG,
  surface: L_BG_SOFT,
  text: L_INK,
  textSecondary: L_INK_2,
  textTertiary: L_INK_3,
  border: L_LINE,
  divider: L_LINE_2,
  white: '#FFFFFF',
  black: L_INK,

  gradientWarm: [L_BG_SOFT, L_BG] as readonly string[],
  gradientGold: ['rgba(199, 117, 90, 0.06)', 'rgba(199, 117, 90, 0)'] as readonly string[],
};

export type ColorScheme = {
  [K in keyof typeof dark]: string | readonly string[];
};

export type PaletteKey = 'classic';

export const PALETTE_OPTIONS: { value: PaletteKey; label: string }[] = [
  { value: 'classic', label: 'Classic' },
];

const palettes: Record<PaletteKey, { dark: typeof dark; light: typeof light }> = {
  classic: { dark, light },
};

let activePaletteKey: PaletteKey = 'classic';

export const themes: Record<'dark' | 'light', typeof dark> = {
  dark: palettes.classic.dark,
  light: palettes.classic.light,
};

// Default export — auth screens use this directly
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
