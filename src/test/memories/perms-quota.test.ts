import { describe, expect, it } from 'vitest';
import perms from '@/instant.perms';
import { QUOTA_FREE_BYTES, QUOTA_PRO_BYTES } from '@/src/lib/memories/quota';

describe('memoryAttachments quota perms', () => {
  it('predicate references mediaQuota.bytesUsed and includes both plan caps', () => {
    const expr = (perms as any).rules?.memoryAttachments?.allow?.create
      ?? (perms as any).memoryAttachments?.allow?.create;
    expect(expr).toMatch(/mediaQuota\.bytesUsed/);
    expect(expr).toMatch(new RegExp(String(QUOTA_FREE_BYTES)));
    expect(expr).toMatch(new RegExp(String(QUOTA_PRO_BYTES)));
  });
});
