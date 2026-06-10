import { Platform } from 'react-native';

// Typography families, radii, shadows, spacing — ported from the design's system.jsx.

const pickFont = (families: { ios: string; android: string; web: string }) =>
  Platform.select(families) ?? families.ios;

export const FONTS = {
  display400: 'SchibstedGrotesk_400Regular',
  display500: 'SchibstedGrotesk_500Medium',
  display600: 'SchibstedGrotesk_600SemiBold',
  display700: 'SchibstedGrotesk_700Bold',
  displayItalic500: 'SchibstedGrotesk_500Medium_Italic',
  sans400: 'SchibstedGrotesk_400Regular',
  sans500: 'SchibstedGrotesk_500Medium',
  sans600: 'SchibstedGrotesk_600SemiBold',
  sans700: 'SchibstedGrotesk_700Bold',
  mono400: pickFont({ ios: 'Menlo-Regular', android: 'monospace', web: 'Menlo, Monaco, monospace' }),
  mono500: pickFont({ ios: 'Menlo-Regular', android: 'monospace', web: 'Menlo, Monaco, monospace' }),
  mono600: pickFont({ ios: 'Menlo-Bold', android: 'monospace', web: 'Menlo, Monaco, monospace' }),
  editorialSerif: 'InstrumentSerif_400Regular',
  pixel: 'BitcountPropSingle_400Regular',
} as const;

export const sansFamily = (weight: number = 500): string =>
  weight >= 650
    ? FONTS.sans700
    : weight >= 550
      ? FONTS.sans600
      : weight >= 450
        ? FONTS.sans500
        : FONTS.sans400;

export const displayFamily = (weight: number = 600): string =>
  weight >= 650
    ? FONTS.display700
    : weight >= 550
      ? FONTS.display600
      : weight >= 450
        ? FONTS.display500
        : FONTS.display400;

export const monoFamily = (weight: number = 500): string =>
  weight >= 550 ? FONTS.mono600 : weight >= 450 ? FONTS.mono500 : FONTS.mono400;

export const RADII = {
  card: 26,
  cardSm: 18, // inner/sunk boxes (invite code, members card) nested inside cards
  button: 999, // fully rounded — every button is a capsule
  pill: 999,
  sheet: 30,
  round: 999,
} as const;

// Shared height for the bottom tab pill + AI button so they line up exactly.
export const TAB_BAR_H = 54;

// Layered shadows from the design. RN 0.85 (new arch) supports the `boxShadow` style string.
export const SHADOWS = {
  card: '0px 1px 2px rgba(20,20,22,0.04), 0px 8px 24px rgba(20,20,22,0.05)',
  soft: '0px 1px 2px rgba(20,20,22,0.04), 0px 6px 16px rgba(20,20,22,0.05)',
  ghost: '0px 1px 2px rgba(20,20,22,0.04), 0px 6px 18px rgba(20,20,22,0.05)',
  tabBar: '0px 2px 8px rgba(20,20,22,0.06), 0px 12px 30px rgba(20,20,22,0.10)',
} as const;

export const SPACE = {
  screenX: 24, // horizontal screen padding
  tabClear: 112, // bottom scroll padding so content clears the tab bar
  topBar: 58, // status-bar / safe-area offset on the top bar
} as const;
