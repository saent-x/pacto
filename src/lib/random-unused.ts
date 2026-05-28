export function pickRandomUnusedValue<T extends string>(
  options: readonly T[],
  usedValues: readonly unknown[],
  random: () => number = Math.random,
): T {
  if (options.length === 0) {
    throw new Error('pickRandomUnusedValue requires at least one option');
  }

  const optionSet = new Set(options);
  const used = new Set(
    usedValues.filter(
      (value): value is T => typeof value === 'string' && optionSet.has(value as T),
    ),
  );
  const unused = options.filter((option) => !used.has(option));
  const pool = unused.length > 0 ? unused : options;
  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.max(0, Math.min(random(), 0.999999)) * pool.length),
  );
  return pool[index] ?? options[0];
}
