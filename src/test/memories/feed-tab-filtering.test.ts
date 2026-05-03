import { describe, expect, it } from 'vitest';
import { buildFeedQuery } from '@/src/hooks/memories/useMemoriesFeed';

describe('buildFeedQuery', () => {
  const spaceId = 'space-1';
  const userId  = 'user-1';

  it('recent: orders by createdAt desc, no isPrivate filter, no isPinned', () => {
    const q = buildFeedQuery({ tab: 'recent', spaceId, userId });
    const where = (q.memories as any).$.where;
    expect(where['space.id']).toBe(spaceId);
    expect(where).not.toHaveProperty('isPinned');
    expect((q.memories as any).$.order).toEqual({ createdAt: 'desc' });
  });

  it('highlights: filters isPinned=true OR reactionCount>=threshold', () => {
    const q = buildFeedQuery({ tab: 'highlights', spaceId, userId });
    const where = (q.memories as any).$.where;
    const stringified = JSON.stringify(where);
    expect(stringified).toContain('isPinned');
    expect(stringified).toContain('reactionCount');
  });

  it('private: requires author == userId AND isPrivate == true', () => {
    const q = buildFeedQuery({ tab: 'private', spaceId, userId });
    const where = (q.memories as any).$.where;
    expect(where['author.id']).toBe(userId);
    expect(where.isPrivate).toBe(true);
  });
});
