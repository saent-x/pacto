import { TextStyle, Platform } from 'react-native';

// Display: platform serif for personality
const serifFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

// Body: system sans for readability on dark bg
const sansFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  // Serif display styles — the signature
  display: {
    fontFamily: serifFamily,
    fontSize: 42,
    fontWeight: '400' as const,
    lineHeight: 48,
    letterSpacing: -0.5,
  } as TextStyle,
  largeTitle: {
    fontFamily: serifFamily,
    fontSize: 34,
    fontWeight: '400' as const,
    lineHeight: 40,
    letterSpacing: -0.3,
  } as TextStyle,
  title: {
    fontFamily: serifFamily,
    fontSize: 26,
    fontWeight: '400' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  } as TextStyle,
  heading: {
    fontFamily: serifFamily,
    fontSize: 21,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 0,
  } as TextStyle,

  // Sans body styles — clean and functional
  subheading: {
    fontFamily: sansFamily,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,
  body: {
    fontFamily: sansFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  } as TextStyle,
  bodyMedium: {
    fontFamily: sansFamily,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  } as TextStyle,
  caption: {
    fontFamily: sansFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,
  captionMedium: {
    fontFamily: sansFamily,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,
  small: {
    fontFamily: sansFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
  } as TextStyle,
  overline: {
    fontFamily: sansFamily,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // Mono — for codes, numbers, data
  mono: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' }),
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 2,
  } as TextStyle,
} as const;
