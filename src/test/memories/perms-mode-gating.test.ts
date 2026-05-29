import { describe, expect, it } from 'vitest';
import perms from '@/instant.perms';

describe('memories perms', () => {
  const r = (perms as any).rules ?? perms;

  it('defines rules for all 8 new entities', () => {
    expect(r.memories).toBeDefined();
    expect(r.memoryReactions).toBeDefined();
    expect(r.memoryAttachments).toBeDefined();
    expect(r.memoryPolls).toBeDefined();
    expect(r.memoryPollOptions).toBeDefined();
    expect(r.memoryPollVotes).toBeDefined();
    expect(r.mediaQuotaUsage).toBeDefined();
    expect(r.aiUsage).toBeDefined();
  });

  it('memoryReactions create rule blocks solo spaces (predicate references space.kind)', () => {
    const expr = r.memoryReactions.allow.create as string;
    expect(expr).toMatch(/space\.kind/);
    expect(expr).toMatch(/'pair'/);
    expect(expr).toMatch(/'crew'/);
  });

  it('memoryPolls create rule restricts to crew', () => {
    const expr = r.memoryPolls.allow.create as string;
    expect(expr).toMatch(/space\.kind/);
    expect(expr).toMatch(/'crew'/);
  });

  it('mediaQuotaUsage can be initialized by space members but not updated by clients', () => {
    expect(r.mediaQuotaUsage.allow.create).toContain("auth.id in data.ref('space.memberships.user.id')");
    expect(r.mediaQuotaUsage.allow.create).toContain("data.ref('space.mediaQuota.id')[0] == null");
    expect(r.mediaQuotaUsage.allow.create).toContain('newData.bytesUsed == 0');
    expect(r.mediaQuotaUsage.allow.update).toBe('false');
    expect(r.mediaQuotaUsage.allow.delete).toBe('false');
  });

  it('aiUsage is server-managed (no create/update/delete from clients)', () => {
    for (const action of ['create', 'update', 'delete']) {
      expect(r.aiUsage.allow[action]).toBe('false');
    }
  });

  it('owner-gated delete rules use valid CEL quotes (no backslash-escaped single quotes)', () => {
    // Critical: \\'owner\\' would produce literal backslashes at runtime, breaking the CEL parser.
    for (const ent of ['memories', 'memoryAttachments', 'memoryPolls', 'memoryPollOptions']) {
      const expr = r[ent].allow.delete as string;
      expect(expr).not.toMatch(/\\'owner\\'/);
      expect(expr).toMatch(/'owner'|"owner"/);
    }
  });
});
