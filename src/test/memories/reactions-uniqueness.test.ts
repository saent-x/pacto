import { describe, expect, it } from 'vitest';
import perms from '@/instant.perms';

describe('memoryReactions perms enforce one-per-user-per-memory', () => {
  it('create rule binds reaction to auth.id and rejects duplicate reactions on the same memory', () => {
    const expr = (perms as any).rules?.memoryReactions?.allow?.create
      ?? (perms as any).memoryReactions?.allow?.create;
    expect(expr).toContain("auth.id == data.ref('user.id')[0]");
    expect(expr).not.toContain('newData.user');
    expect(expr).toContain("!(auth.id in data.ref('memory.reactions.user.id'))");
  });

  it('create rule binds poll votes to the linked authenticated user', () => {
    const expr = (perms as any).rules?.memoryPollVotes?.allow?.create
      ?? (perms as any).memoryPollVotes?.allow?.create;
    expect(expr).toContain("auth.id == data.ref('user.id')[0]");
    expect(expr).not.toContain('newData.user');
    expect(expr).toContain("!(auth.id in data.ref('option.poll.options.votes.user.id'))");
  });
});
