// Shared sizing for the Tasks feature. Keeps ListCard (grid tile) and
// TaskRow (list row) on one scale without forcing them into the same form.
export const taskTokens = {
  cardRadius: 22,
  rowRadius: 16,
  cardPadX: 16,
  cardPadY: 16,
  cardMinHeight: 136,
  rowPadX: 16,
  rowPadY: 14,
  rowGap: 14,
  rowMinHeight: 54,
} as const;
