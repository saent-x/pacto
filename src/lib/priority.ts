export const PRIORITY_MIN = 0;
export const PRIORITY_MAX = 3;

export function isValidPriority(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PRIORITY_MIN &&
    value <= PRIORITY_MAX
  );
}

export function assertValidPriority(value: unknown): asserts value is number | undefined {
  if (value !== undefined && !isValidPriority(value)) {
    throw new Error('Invalid priority');
  }
}

export function normalizePriority(value: unknown): number {
  return isValidPriority(value) ? value : PRIORITY_MIN;
}
