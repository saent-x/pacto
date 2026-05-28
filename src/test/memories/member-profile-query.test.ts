import { describe, expect, it } from 'vitest';
import { buildMemberProfileQuery } from '@/src/hooks/memories/useMemberProfile';

describe('member profile memories query', () => {
  it('loads the relations needed by MemoryPost cards', () => {
    const query = buildMemberProfileQuery('user-1', 'space-1') as any;
    const memories = query.memories;

    expect(memories.author).toBeDefined();
    expect(memories.attachments).toBeDefined();
    expect(memories.reactions.user).toBeDefined();
    expect(memories.poll.options.votes.user).toBeDefined();
    expect(memories.replyTo).toBeDefined();
    expect(memories.quoteOf.author).toBeDefined();
    expect(memories.quoteOf.attachments).toBeDefined();
    expect(memories.repostOf.author).toBeDefined();
    expect(memories.repostOf.attachments).toBeDefined();
    expect(memories.repostOf.reactions.user).toBeDefined();
    expect(memories.repostOf.poll.options.votes.user).toBeDefined();
    expect(memories.repostOf.quoteOf.author).toBeDefined();
    expect(memories.repostOf.quoteOf.attachments).toBeDefined();
  });

  it('can include personal and shared spaces for the current user profile', () => {
    const query = buildMemberProfileQuery('user-1', ['solo-1', 'shared-1']) as any;

    expect(query.memories.$.where).toEqual({
      and: [
        { 'author.id': 'user-1' },
        {
          or: [
            { 'space.id': 'solo-1' },
            { 'space.id': 'shared-1' },
          ],
        },
      ],
    });
    expect(query.memberships.$.where).toEqual({
      and: [
        { 'user.id': 'user-1' },
        {
          or: [
            { 'space.id': 'solo-1' },
            { 'space.id': 'shared-1' },
          ],
        },
      ],
    });
  });
});
