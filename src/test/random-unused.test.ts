import { describe, expect, it } from 'vitest';
import { pickRandomUnusedValue } from '@/src/lib/random-unused';

describe('pickRandomUnusedValue', () => {
  it('randomly picks only from options that have not been used yet', () => {
    const options = ['peach', 'mint', 'sky'] as const;

    expect(
      pickRandomUnusedValue(options, ['peach'], () => 0),
    ).toBe('mint');
    expect(
      pickRandomUnusedValue(options, ['peach'], () => 0.99),
    ).toBe('sky');
  });

  it('allows repeats only after every option has already been used', () => {
    const options = ['peach', 'mint', 'sky'] as const;

    expect(
      pickRandomUnusedValue(options, ['peach', 'mint', 'sky'], () => 0.51),
    ).toBe('mint');
  });

  it('ignores unknown persisted values when calculating unused options', () => {
    const options = ['peach', 'mint', 'sky'] as const;

    expect(
      pickRandomUnusedValue(options, ['unknown', null, 'peach'], () => 0),
    ).toBe('mint');
  });
});
