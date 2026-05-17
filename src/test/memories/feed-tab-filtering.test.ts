import { describe, expect, it } from 'vitest';
import { buildFeedQuery } from '@/src/hooks/memories/useMemoriesFeed';

describe('buildFeedQuery (post Threads-redesign — single feed, topic filter is client-side)', () => {
  const spaceId = 'space-1';

  it('orders by createdAt desc with limit 50, scoped to space', () => {
    const q = buildFeedQuery({ spaceId });
    const where = (q.memories as any).$.where;
    expect(where['space.id']).toBe(spaceId);
    expect((q.memories as any).$.order).toEqual({ createdAt: 'desc' });
    expect((q.memories as any).$.limit).toBe(50);
  });

  it('expands relevant entity links for the feed cards', () => {
    const q = buildFeedQuery({ spaceId });
    const m = q.memories as any;
    expect(m.author).toBeDefined();
    expect(m.attachments).toBeDefined();
    expect(m.reactions).toBeDefined();
    expect(m.poll).toBeDefined();
    expect(m.replyTo).toBeDefined();
    expect(m.quoteOf).toBeDefined();
    expect(m.repostOf).toBeDefined();
  });
});
