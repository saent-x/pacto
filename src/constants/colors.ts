// Pacto FULL PALETTE / WARM NIGHT palette
// OKLCH-authored values converted to hex for React Native style support.
//
// Three accent hues sharing chroma 0.13 / lightness 0.68:
//   - accent   = terracotta-rose (mine / Maya / primary)
//   - accent2  = sage             (partner / Jordan / secondary)
//   - accent3  = honey            (shared / tertiary)
//
// Legacy keys (gold, bone, coal, etc.) are kept and re-pointed at the new tokens so existing
// screens render immediately under the new palette while Phase 6+7+8+10 rebuild them.

// ─── Tokens (light) ──────────────────────────────────────────────
const L_BG = '#FBF6EA';
const L_BG_SOFT = '#F1E8D8';
const L_BG_CARD = '#FFF9EE';
const L_INK = '#2C2118';
const L_INK_2 = '#625442';
const L_INK_3 = '#92846E';
const L_LINE = '#E3D8C5';
const L_LINE_2 = '#D4C5AD';
const L_ACCENT = '#C86F54';
const L_ACCENT_2 = '#5EAFA0';
const L_ACCENT_3 = '#BD9850';
const L_ACCENT_SOFT = '#F4D8CA';
const L_ACCENT_2_SOFT = '#D9ECE5';
const L_ACCENT_3_SOFT = '#EFE0B9';

// ─── Tokens (dark) ───────────────────────────────────────────────
const D_BG = '#211A15';
const D_BG_SOFT = '#2B231D';
const D_BG_CARD = '#352B23';
const D_INK = '#F1E7D6';
const D_INK_2 = '#CBBCA4';
const D_INK_3 = '#93836E';
const D_LINE = '#4B4033';
const D_LINE_2 = '#5E5141';
const D_ACCENT = '#D48668';
const D_ACCENT_2 = '#79C0AE';
const D_ACCENT_3 = '#D5B66B';
const D_ACCENT_SOFT = '#56372A';
const D_ACCENT_2_SOFT = '#2F4942';
const D_ACCENT_3_SOFT = '#4F4326';

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
  primaryDark: '#A85C43',
  primaryMuted: '#493226',
  primaryVivid: '#E0A085',

  ink: D_BG,
  coal: D_BG_SOFT,
  card: D_BG_CARD,
  cardHi: '#3E3127',
  line: D_LINE,
  lineHi: D_LINE_2,
  bone: D_INK,
  mist: D_INK_2,
  fog: D_INK_3,
  ash: '#776753',
  gold: D_ACCENT,
  goldDim: '#A85C43',
  goldSoft: '#493226',

  night: D_BG_SOFT,
  dark: D_BG_CARD,
  dim: '#3E3127',
  muted: D_LINE,
  dusk: D_LINE_2,
  haze: D_INK_2,
  cream: D_INK,
  parchment: D_INK,

  success: '#91C477',
  successLight: '#2F482C',
  warning: '#D8A64C',
  warningLight: '#4C3A20',
  error: '#E27B68',
  errorLight: '#522F29',
  info: '#719CB6',
  infoLight: '#2E414C',

  reminders: '#A092D7',
  remindersLight: '#3D3656',
  tasks: '#7CBC9A',
  tasksLight: '#31483B',
  journal: '#D08F70',
  journalLight: '#4B352B',
  wish: '#D8A64C',
  wishLight: '#4C3A20',
  wishlists: '#D8A64C',
  wishlistsLight: '#4C3A20',
  plans: '#95BC74',
  plansLight: '#3A482D',
  checklists: '#719CB6',
  checklistsLight: '#2E414C',
  milestones: '#D08F70',
  milestonesLight: '#4B352B',
  mood: '#A092D7',
  moodLight: '#3D3656',

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
  gradientGold: ['#493226', D_BG] as readonly string[],
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
  primaryDark: '#9B543D',
  primaryMuted: '#F2D8C8',
  primaryVivid: '#BB6246',

  ink: L_BG,
  coal: L_BG_SOFT,
  card: L_BG_CARD,
  cardHi: '#FFFCF4',
  line: L_LINE,
  lineHi: L_LINE_2,
  bone: L_INK,
  mist: L_INK_2,
  fog: L_INK_3,
  ash: '#A3957B',
  gold: L_ACCENT,
  goldDim: '#9B543D',
  goldSoft: '#F2D8C8',

  night: L_BG_SOFT,
  dark: L_BG_CARD,
  dim: '#FFFCF4',
  muted: L_LINE,
  dusk: L_LINE_2,
  haze: L_INK_2,
  cream: L_INK,
  parchment: L_INK,

  success: '#6D965A',
  successLight: '#DFEBD4',
  warning: '#C99135',
  warningLight: '#F1DFC0',
  error: '#BD5948',
  errorLight: '#F3D3CA',
  info: '#5C8EAA',
  infoLight: '#D8E8F0',

  reminders: '#8B78C0',
  remindersLight: '#E4DEF3',
  tasks: '#5F9B7B',
  tasksLight: '#DCEBDF',
  journal: '#B7785D',
  journalLight: '#ECD9CC',
  wish: '#C99135',
  wishLight: '#F1DFC0',
  wishlists: '#C99135',
  wishlistsLight: '#F1DFC0',
  plans: '#789D57',
  plansLight: '#E1EAD2',
  checklists: '#5C8EAA',
  checklistsLight: '#D8E8F0',
  milestones: '#B7785D',
  milestonesLight: '#ECD9CC',
  mood: '#8B78C0',
  moodLight: '#E4DEF3',

  background: L_BG,
  screenBackground: L_BG,
  surface: L_BG_SOFT,
  text: L_INK,
  textSecondary: L_INK_2,
  textTertiary: L_INK_3,
  border: L_LINE,
  divider: L_LINE_2,
  white: L_BG_CARD,
  black: L_INK,

  gradientWarm: [L_BG_SOFT, L_BG] as readonly string[],
  gradientGold: ['#F2D8C8', L_BG] as readonly string[],
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
