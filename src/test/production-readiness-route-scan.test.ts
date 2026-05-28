import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('production readiness route scan', () => {
  it('keeps retired modules out of active app navigation', () => {
    const output = execFileSync(
      process.execPath,
      ['scripts/qa/route-reference-scan.mjs'],
      { encoding: 'utf8' },
    );

    expect(output).toContain('No retired feature route references');
  });
});
