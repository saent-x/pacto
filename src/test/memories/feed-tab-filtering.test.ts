import { describe, expect, it } from 'vitest';
import {
  buildFeedQuery,
  filterFeedMemories,
} from '@/src/hooks/memories/useMemoriesFeed';

describe('buildFeedQuery (post Threads-redesign — single feed, topic filter is client-side)', () => {
  const spaceId = 'space-1';

  it('orders by createdAt desc with limit 50, scoped to space', () => {
    const q = buildFeedQuery({ spaceId });
    const where = (q.memories as any).$.where;
    expect(where['space.id']).toBe(spaceId);
    expect((q.memories as any).$.order).toEqual({ createdAt: 'desc' });
    expect((q.memories as any).$.limit).toBe(50);
  });

  it('can scope the feed to permanent solo and active shared pact spaces', () => {
    const q = buildFeedQuery({ spaceIds: ['solo-1', 'shared-1'] });
    const where = (q.memories as any).$.where;

    expect(where).toEqual({
      or: [{ 'space.id': 'solo-1' }, { 'space.id': 'shared-1' }],
    });
  });

  it('expands relevant entity links for the feed cards', () => {
    const q = buildFeedQuery({ spaceId });
    const m = q.memories as any;
    expect(m.space).toBeDefined();
    expect(m.author).toBeDefined();
    expect(m.attachments).toBeDefined();
    expect(m.reactions).toBeDefined();
    expect(m.poll).toBeDefined();
    expect(m.replyTo).toBeDefined();
    expect(m.quoteOf).toBeDefined();
    expect(m.repostOf).toBeDefined();
  });

  it('expands poll vote users so the feed can identify the current user vote', () => {
    const q = buildFeedQuery({ spaceId });
    const m = q.memories as any;
    expect(m.poll.options.votes.user).toBeDefined();
  });

  it('loads nested MemoryPost relations for reposted originals', () => {
    const q = buildFeedQuery({ spaceId });
    const repostOf = (q.memories as any).repostOf;

    expect(repostOf.author).toBeDefined();
    expect(repostOf.space).toBeDefined();
    expect(repostOf.attachments).toBeDefined();
    expect(repostOf.reactions.user).toBeDefined();
    expect(repostOf.poll.options.votes.user).toBeDefined();
    expect(repostOf.quoteOf.author).toBeDefined();
    expect(repostOf.quoteOf.space).toBeDefined();
    expect(repostOf.quoteOf.attachments).toBeDefined();
  });

  it('removes replies from top-level feed topic results', () => {
    const memories = [
      { id: 'post-1', kind: 'post', author: { id: 'me' }, tags: ['travel'] },
      { id: 'reply-by-kind', kind: 'reply', author: { id: 'me' }, tags: ['travel'] },
      { id: 'reply-by-link', kind: 'post', author: { id: 'them' }, replyTo: { id: 'post-1' }, tags: ['travel'] },
      { id: 'post-2', kind: 'post', author: { id: 'them' }, tags: ['travel'] },
    ];

    expect(filterFeedMemories(memories, 'all', 'me').map((m) => m.id)).toEqual(['post-1', 'post-2']);
    expect(filterFeedMemories(memories, 'mine', 'me').map((m) => m.id)).toEqual(['post-1']);
    expect(filterFeedMemories(memories, 'us', 'me').map((m) => m.id)).toEqual(['post-2']);
    expect(filterFeedMemories(memories, 'travel', 'me').map((m) => m.id)).toEqual(['post-1', 'post-2']);
  });

  it('keeps former-member shared memories visible in the Just us filter', () => {
    const memories = [
      { id: 'mine', kind: 'post', author: { id: 'me' } },
      { id: 'theirs', kind: 'post', author: { id: 'them' } },
      { id: 'former-member', kind: 'post', author: null },
    ];

    expect(filterFeedMemories(memories, 'us', 'me').map((m) => m.id)).toEqual([
      'theirs',
      'former-member',
    ]);
  });

  it('does not treat personal-space legacy private memories as Just us', () => {
    const memories = [
      { id: 'personal-legacy', kind: 'post', author: null, space: { id: 'solo-1' } },
      { id: 'shared-former-member', kind: 'post', author: null, space: { id: 'shared-1' } },
    ];

    expect(
      filterFeedMemories(memories, 'us', 'me', { personalSpaceId: 'solo-1' }).map((m) => m.id),
    ).toEqual(['shared-former-member']);
  });

  it('normalizes stale personal-space memories as private before rendering feed actions', () => {
    const memories = [
      {
        id: 'legacy-personal',
        kind: 'post',
        isPrivate: false,
        author: { id: 'me' },
        space: { id: 'solo-1' },
      },
      {
        id: 'shared',
        kind: 'post',
        isPrivate: false,
        author: { id: 'me' },
        space: { id: 'shared-1' },
      },
    ];

    expect(
      filterFeedMemories(memories, 'all', 'me', { personalSpaceId: 'solo-1' })
        .map((memory) => ({ id: memory.id, isPrivate: memory.isPrivate })),
    ).toEqual([
      { id: 'legacy-personal', isPrivate: true },
      { id: 'shared', isPrivate: false },
    ]);
  });

  it('excludes explicit partner-authored memories from the current user personal space', () => {
    const memories = [
      {
        id: 'personal-partner-memory',
        kind: 'post',
        isPrivate: false,
        author: { id: 'partner-1' },
        space: { id: 'solo-1' },
      },
      {
        id: 'personal-self-memory',
        kind: 'post',
        isPrivate: false,
        author: { id: 'me' },
        space: { id: 'solo-1' },
      },
      {
        id: 'shared-partner-memory',
        kind: 'post',
        isPrivate: false,
        author: { id: 'partner-1' },
        space: { id: 'shared-1' },
      },
    ];

    expect(
      filterFeedMemories(memories, 'all', 'me', { personalSpaceId: 'solo-1' })
        .map((memory) => memory.id),
    ).toEqual(['personal-self-memory', 'shared-partner-memory']);

    expect(
      filterFeedMemories(memories, 'mine', 'me', { personalSpaceId: 'solo-1' })
        .map((memory) => memory.id),
    ).toEqual(['personal-self-memory']);

    expect(
      filterFeedMemories(memories, 'us', 'me', { personalSpaceId: 'solo-1' })
        .map((memory) => memory.id),
    ).toEqual(['shared-partner-memory']);
  });
});
