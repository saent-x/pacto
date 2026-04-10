import { TextStyle, Platform } from 'react-native';

// Display: Newsreader italic serif — the signature look for headings
const serifFamily = 'Newsreader_300Light_Italic';
const serifRegular = 'Newsreader_400Regular';

// Body: DM Sans — clean, modern, with full italic + bold-italic support
const sansFamily = 'DMSans_400Regular';
const sansMedium = 'DMSans_500Medium';
const sansSemiBold = 'DMSans_600SemiBold';

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

  // Standard display styles — keep these clean and legible by default
  display: {
    fontFamily: serifRegular,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: -1.2,
  } as TextStyle,
  largeTitle: {
    fontFamily: serifRegular,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.3,
  } as TextStyle,
  title: {
    fontFamily: serifRegular,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.75,
  } as TextStyle,
  heading: {
    fontFamily: serifRegular,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.6,
  } as TextStyle,
  headingRegular: {
    fontFamily: serifRegular,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0,
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
    fontFamily: sansFamily,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 3,
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

  // Font family references for direct use
  sans: sansFamily,
  sansMedium,
  sansSemiBold,

  // Fallbacks
  fallbackSerif: serifFallback,
  fallbackSans: sansFallback,
} as const;
