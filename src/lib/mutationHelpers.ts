export async function runMutation<T extends Record<string, unknown>>(
  fn: (args: T) => Promise<unknown>,
  args: T,
  fallbackMessage: string,
): Promise<void> {
  try {
    await fn(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : fallbackMessage;
    throw new Error(message);
  }
}

export function skipUnless(condition: unknown): 'skip' | Record<string, never> {
  return condition ? {} : 'skip';
}
