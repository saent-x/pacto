import { describe, expect, it } from 'vitest';
import { buildMemoryDetailQuery } from '@/src/hooks/memories/useMemory';

describe('useMemory query shape', () => {
  it('scopes detail reads to the current personal and shared spaces', () => {
    const query = buildMemoryDetailQuery('55555555-5555-4555-8555-555555555555', ['solo-1', 'shared-1']) as any;

    expect(query.memories.$.where).toEqual({
      and: [
        { id: '55555555-5555-4555-8555-555555555555' },
        {
          or: [
            { 'space.id': 'solo-1' },
            { 'space.id': 'shared-1' },
          ],
        },
      ],
    });
    expect(query.memories.replies.$.where).toEqual({
      or: [
        { 'space.id': 'solo-1' },
        { 'space.id': 'shared-1' },
      ],
    });
  });

  it('orders replies by createdAt asc', () => {
    const query = buildMemoryDetailQuery('memory-1') as any;
    expect(query.memories.replies.$.order).toEqual({ createdAt: 'asc' });
  });

  it('loads MemoryPost relations for replies in detail threads', () => {
    const query = buildMemoryDetailQuery('memory-1') as any;
    const replies = query.memories.replies;

    expect(replies.author).toBeDefined();
    expect(replies.attachments).toBeDefined();
    expect(replies.reactions.user).toBeDefined();
    expect(replies.poll.options.votes.user).toBeDefined();
    expect(replies.quoteOf.author).toBeDefined();
    expect(replies.quoteOf.attachments).toBeDefined();
    expect(replies.repostOf.author).toBeDefined();
    expect(replies.repostOf.attachments).toBeDefined();
    expect(replies.repostOf.reactions.user).toBeDefined();
    expect(replies.repostOf.poll.options.votes.user).toBeDefined();
    expect(replies.repostOf.quoteOf.author).toBeDefined();
    expect(replies.repostOf.quoteOf.attachments).toBeDefined();
  });
});
