/**
 * Shared bottom-sheet design tokens.
 *
 * Every feature sheet should import these instead of recomputing glass colours
 * or redeclaring the same StyleSheet rules.  The aim is a single source of
 * truth so that all sheets feel like one product, not twelve.
 *
 * Font policy:
 *   Sans (DM Sans) = everything — titles, labels, amounts, buttons, toggles.
 */

import { StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

/* ------------------------------------------------------------------ */
/*  Glass helpers                                                      */
/* ------------------------------------------------------------------ */

/** Glass background / border colours derived from the current theme. */
export function useGlass() {
  const { mode } = useTheme();
  return {
    glassBg: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    glassBorder: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };
}

/* ------------------------------------------------------------------ */
/*  Shared sheet styles                                                */
/* ------------------------------------------------------------------ */

export const sheet = StyleSheet.create({
  /** Outer form wrapper — consistent vertical rhythm across every sheet. */
  form: {
    gap: Spacing.xl, // 20 — the canonical sheet gap
  },

  /** Date-header block (overline label + date display). */
  dateHeader: {
    gap: Spacing.xs,
  },

  /** "NEW TASK" / "EDIT PLAN" — bold overline so it reads clearly. */
  sheetLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  /** "Wednesday, April 9" — medium weight for legibility. */
  dateDisplay: {
    fontFamily: Typography.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
  },

  /** Large title input — clean sans-serif, no italic. */
  titleInput: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    padding: 0,
  },

  /** Glass-bordered multiline card (description / notes). */
  bodyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: Spacing.md,
  },

  /** Text input inside bodyCard. */
  bodyInput: {
    ...Typography.body,
    minHeight: 72,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
  },

  /** Generic section wrapper (label + control). */
  section: {
    gap: Spacing.md,
  },

  /** Section label — DM Sans overline. */
  sectionTitle: {
    ...Typography.overline,
    letterSpacing: 2,
  },

  /** Row of date / time pills. */
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  /** Rounded pill button (date, time, filter). */
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },

  /** Text inside a glass pill. */
  glassPillText: {
    ...Typography.captionMedium,
  },

  /** Inline text field wrapped in a glass rectangle (URL, price). */
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },

  /** Text input inside inputCard. */
  fieldInput: {
    ...Typography.body,
    flex: 1,
    padding: 0,
  },

  /** Row of equal-width toggle buttons (priority, assign-to). */
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  /** Single toggle button inside toggleRow. */
  glassToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },

  /** Label inside a toggle. */
  toggleText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },

  /** Scrollable chip row (category, status). */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  /** Individual chip. */
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },

  /** Chip with icon + text (milestones). */
  chipWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },

  /** Text inside a chip. */
  chipText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },

  /* ---- Amount / currency (DM Sans, NOT serif) ---- */

  /** Row for currency symbol + amount input. */
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  /** Large currency symbol — sans-serif. */
  currencySign: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 32,
    lineHeight: 38,
  },

  /** Large amount text input — sans-serif. */
  amountInput: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 32,
    lineHeight: 38,
    padding: 0,
    flex: 1,
  },

  /** Smaller inline currency symbol (wishlist price). */
  currencySymbol: {
    fontFamily: Typography.sansMedium,
    fontSize: 18,
    lineHeight: 24,
  },

  /* ---- Footer save button ---- */

  /** Full-width CTA at the bottom of every sheet. */
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
  },

  /** Save button label. */
  saveBtnText: {
    ...Typography.subheading,
    fontSize: 15,
  },

  /* ---- Privacy toggle ---- */

  /** Self-sizing privacy pill (shared / private). */
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },

  /** Privacy label text. */
  privacyText: {
    ...Typography.captionMedium,
    fontSize: 13,
  },

  /* ---- Clear / remove button ---- */

  /** Small circular X button (clear date, remove item). */
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
