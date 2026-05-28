import { describe, expect, it } from 'vitest';
import perms from '@/instant.perms';

describe('memoryAttachments quota perms', () => {
  it('does not allow clients to create memory attachment rows directly', () => {
    const expr = (perms as any).rules?.memoryAttachments?.allow?.create
      ?? (perms as any).memoryAttachments?.allow?.create;
    expect(expr).toBe('false');
    expect(expr).not.toMatch(/mediaQuota\.bytesUsed/);
  });
});
