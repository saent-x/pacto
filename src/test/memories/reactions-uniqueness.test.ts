import { describe, expect, it } from 'vitest';
import perms from '@/instant.perms';

describe('memoryReactions perms enforce one-per-user-per-memory', () => {
  it('create rule binds reaction to auth.id', () => {
    const expr = (perms as any).rules?.memoryReactions?.allow?.create
      ?? (perms as any).memoryReactions?.allow?.create;
    expect(expr).toMatch(/auth\.id\s*==\s*newData\.user/);
  });
});
