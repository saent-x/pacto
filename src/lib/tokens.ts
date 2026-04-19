// Coupl design tokens — Warm Block aesthetic

const darkTokens = {
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
  goldSoft: 'rgba(228,178,74,0.14)',
};

const lightTokens = {
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
  goldSoft: 'rgba(184,135,46,0.12)',
};

export const pastels = {
  peach: '#F4A68C',
  peachInk: '#3A1F14',
  lavender: '#B8A8E8',
  lavenderInk: '#1F1635',
  butter: '#F2D86A',
  butterInk: '#3A2E08',
  mint: '#A8D8B9',
  mintInk: '#0F2C1A',
  rose: '#D89BA8',
  roseInk: '#3A1520',
  sky: '#9FC4DC',
  skyInk: '#0E2230',
  reminders: '#9B8EC4',
  tasks: '#7BA08A',
  journal: '#C4977A',
  wish: '#D4A054',
  plans: '#8AAF7B',
  error: '#E07A68',
  success: '#9CC58B',
};

export type ThemeMode = 'light' | 'dark';
export type Tokens = typeof darkTokens & typeof pastels;

export function getTokens(mode: ThemeMode): Tokens {
  return { ...(mode === 'light' ? lightTokens : darkTokens), ...pastels };
}

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayBold: 'BricolageGrotesque_800ExtraBold',
  body: 'SpaceGrotesk_500Medium',
  bodyBold: 'SpaceGrotesk_700Bold',
  serif: 'Georgia',
  mono: 'Menlo',
} as const;
