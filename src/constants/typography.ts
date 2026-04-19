import { TextStyle, Platform } from 'react-native';

// Display: Newsreader italic serif — the signature look for headings
const serifFamily = 'Newsreader_300Light_Italic';
const serifRegular = 'Newsreader_400Regular';
const serifSemiBoldItalic = 'Newsreader_600SemiBold_Italic';

// Body: DM Sans — clean, modern, with full italic + bold-italic support
const sansFamily = 'DMSans_400Regular';
const sansMedium = 'DMSans_500Medium';
const sansSemiBold = 'DMSans_600SemiBold';

// Warm Block display: Bricolage Grotesque — chunky, geometric, confident
const displayFamily = 'BricolageGrotesque_800ExtraBold';
const displaySemiBold = 'BricolageGrotesque_600SemiBold';
const displayBold = 'BricolageGrotesque_700Bold';

// Fallbacks for before fonts load
const serifFallback = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const sansFallback = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' });

export const Typography = {
  // Editorial styles — reserved for very selective accent moments
  editorial: {
    fontFamily: serifFamily,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.6,
    fontStyle: 'italic' as const,
  } as TextStyle,
  editorialLargeTitle: {
    fontFamily: serifFamily,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.3,
    fontStyle: 'italic' as const,
  } as TextStyle,
  editorialLargeTitleBold: {
    fontFamily: serifSemiBoldItalic,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.3,
    fontStyle: 'italic' as const,
  } as TextStyle,

  // Standard display styles — Warm Block redesign uses Bricolage (chunky sans)
  // as the default display face. Serif remains available via `editorial*` styles
  // for the journal verse / pull-quote moments only.
  display: {
    fontFamily: displayFamily,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: -1.4,
  } as TextStyle,
  largeTitle: {
    fontFamily: displayFamily,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
  } as TextStyle,
  title: {
    fontFamily: displayFamily,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.9,
  } as TextStyle,
  heading: {
    fontFamily: displayFamily,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
  } as TextStyle,
  headingRegular: {
    fontFamily: displaySemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
  } as TextStyle,

  // Sans body styles — DM Sans, clean and functional
  subheading: {
    fontFamily: sansSemiBold,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,
  body: {
    fontFamily: sansFamily,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  } as TextStyle,
  bodyMedium: {
    fontFamily: sansMedium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  } as TextStyle,
  caption: {
    fontFamily: sansFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,
  captionMedium: {
    fontFamily: sansMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,
  small: {
    fontFamily: sansFamily,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  } as TextStyle,
  overline: {
    fontFamily: sansSemiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  } as TextStyle,
  pillLabel: {
    fontFamily: sansSemiBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // Logo
  logo: {
    fontFamily: serifFamily,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.75,
    fontStyle: 'italic' as const,
  } as TextStyle,

  // Mono — for codes, numbers, data
  mono: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' }),
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 2,
  } as TextStyle,

  // Warm Block display styles — chunky, high-impact moments (hero labels, big stats)
  displayChunky: {
    fontFamily: displayFamily,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1,
  } as TextStyle,
  displayChunkyLg: {
    fontFamily: displayFamily,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: -1.4,
  } as TextStyle,
  displayChunkyXl: {
    fontFamily: displayFamily,
    fontSize: 64,
    lineHeight: 60,
    letterSpacing: -2,
  } as TextStyle,
  displayChunkySm: {
    fontFamily: displayFamily,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
  } as TextStyle,
  displayChunkyBold: {
    fontFamily: displayBold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.6,
  } as TextStyle,

  // Font family references for direct use
  sans: sansFamily,
  sansMedium,
  sansSemiBold,
  displayFont: displayFamily,
  displaySemiBoldFont: displaySemiBold,
  displayBoldFont: displayBold,

  // Fallbacks
  fallbackSerif: serifFallback,
  fallbackSans: sansFallback,
} as const;
