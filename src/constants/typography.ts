import { TextStyle, Platform } from 'react-native';

// ─── Pacto type system ─────────────────────────────────────────────
// Display: Bitcount Prop Single — brand titles, wordmark, big counters
// Body: Geist Medium+ — UI rows, paragraphs, buttons, dialogue
// Mono: Geist Mono Medium — eyebrow tags, metadata, codes, timestamps
//
// Design source: /tmp/pacto-design/coupl-design-ii/project/index.html (see :root tokens)
// "Maya & Jordan"-style hero title uses the pixel display family across every top-level screen.

// Display family: Bitcount Prop Single. It keeps the pixel language but has real
// weights, which gives Pacto a clearer hierarchy than the previous single-weight
// pixel face.
const pixelRegular = 'BitcountPropSingle_400Regular';
const pixelMedium = 'BitcountPropSingle_500Medium';
const pixelBold = 'BitcountPropSingle_700Bold';

const geistLight = 'Geist_400Regular';
const geistRegular = 'Geist_500Medium';
const geistMedium = 'Geist_500Medium';
const geistSemiBold = 'Geist_600SemiBold';
const geistBold = 'Geist_700Bold';

const geistMonoRegular = 'GeistMono_500Medium';
const geistMonoMedium = 'GeistMono_500Medium';

// Legacy aliases now resolve into the active system so older screens inherit
// the same visual language without needing per-screen migrations.
const legacyDisplay = pixelBold;
const legacyDisplayBold = pixelBold;

const sansFallback = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' });
const monoFallback = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const Typography = {
  // ─── Hero / display (pixel font) ─────────────────────────────────
  // PixelHero pattern: eyebrow (mono uppercase) + display title (pixel).
  pixelHero: {
    fontFamily: pixelBold,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: 0,
  } as TextStyle,
  pixelHeroLg: {
    fontFamily: pixelBold,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: 0,
  } as TextStyle,
  pixelHeroSm: {
    fontFamily: pixelBold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 0,
  } as TextStyle,
  pixelCounter: {
    fontFamily: pixelBold,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: 0,
  } as TextStyle,
  pixelLabel: {
    fontFamily: pixelMedium,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,

  // ─── Eyebrow (Geist Mono uppercase) ──────────────────────────────
  // Above PixelHero titles, on cards, section headers.
  eyebrow: {
    fontFamily: geistMonoMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  } as TextStyle,
  eyebrowSm: {
    fontFamily: geistMonoMedium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // ─── Body (Geist) ────────────────────────────────────────────────
  body: {
    fontFamily: geistRegular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  } as TextStyle,
  bodyMedium: {
    fontFamily: geistMedium,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  } as TextStyle,
  bodyLg: {
    fontFamily: geistRegular,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,
  subheading: {
    fontFamily: geistSemiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  } as TextStyle,
  caption: {
    fontFamily: geistRegular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,
  captionMedium: {
    fontFamily: geistMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,
  small: {
    fontFamily: geistRegular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  } as TextStyle,
  smallMedium: {
    fontFamily: geistMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  } as TextStyle,
  buttonLabel: {
    fontFamily: geistSemiBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,
  pillLabel: {
    fontFamily: geistMedium,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0,
  } as TextStyle,

  // ─── Mono ────────────────────────────────────────────────────────
  mono: {
    fontFamily: geistMonoRegular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,
  monoMedium: {
    fontFamily: geistMonoMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,
  monoLg: {
    fontFamily: geistMonoRegular,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 2,
  } as TextStyle,
  monoXl: {
    // Invite-code 6-char input style
    fontFamily: geistMonoMedium,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 4,
  } as TextStyle,

  // ─── Logo (pacto wordmark) ───────────────────────────────────────
  logo: {
    fontFamily: pixelBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0,
    textTransform: 'lowercase' as const,
  } as TextStyle,
  logoSm: {
    fontFamily: pixelMedium,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0,
    textTransform: 'lowercase' as const,
  } as TextStyle,

  // ─── Legacy aliases ──────────────────────────────────────────────
  // Existing screens reference these. Pointed at the new pixel display so the rebrand
  // visually lands immediately; will be removed as Phase 6+7+8+10 replace consumers.
  display: {
    fontFamily: pixelBold,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: 0,
  } as TextStyle,
  largeTitle: {
    fontFamily: pixelBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0,
  } as TextStyle,
  title: {
    fontFamily: pixelBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0,
  } as TextStyle,
  heading: {
    fontFamily: pixelMedium,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
  } as TextStyle,
  headingRegular: {
    fontFamily: geistSemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,
  overline: {
    fontFamily: geistMonoMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // Legacy editorial/serif keys — kept neutral to avoid layout pops in pre-rebuild screens.
  editorial: {
    fontFamily: geistRegular,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0,
  } as TextStyle,
  editorialLargeTitle: {
    fontFamily: pixelBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0,
  } as TextStyle,
  editorialLargeTitleBold: {
    fontFamily: pixelBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0,
  } as TextStyle,

  // Legacy chunky keys — re-pointed at pixel
  displayChunky: {
    fontFamily: pixelBold,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: 0,
  } as TextStyle,
  displayChunkyLg: {
    fontFamily: pixelBold,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: 0,
  } as TextStyle,
  displayChunkyXl: {
    fontFamily: pixelBold,
    fontSize: 64,
    lineHeight: 60,
    letterSpacing: 0,
  } as TextStyle,
  displayChunkySm: {
    fontFamily: pixelBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0,
  } as TextStyle,
  displayChunkyBold: {
    fontFamily: pixelBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
  } as TextStyle,

  // ─── Family references ───────────────────────────────────────────
  pixelFont: pixelBold,
  pixelMediumFont: pixelMedium,
  pixelRegularFont: pixelRegular,
  geistFont: geistRegular,
  geistMediumFont: geistMedium,
  geistSemiBoldFont: geistSemiBold,
  geistBoldFont: geistBold,
  geistLightFont: geistLight,
  geistMonoFont: geistMonoRegular,
  geistMonoMediumFont: geistMonoMedium,

  // Legacy family aliases (pointed at new system)
  sans: geistRegular,
  sansMedium: geistMedium,
  sansSemiBold: geistSemiBold,
  displayFont: pixelBold,
  displaySemiBoldFont: pixelMedium,
  displayBoldFont: pixelBold,

  // Truly legacy fallbacks — only used by screens that haven't migrated
  legacyDisplayFont: legacyDisplay,
  legacyDisplayBoldFont: legacyDisplayBold,

  // System fallbacks
  fallbackSans: sansFallback,
  fallbackMono: monoFallback,
  fallbackSerif: sansFallback,
} as const;
