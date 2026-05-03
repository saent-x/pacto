import { describe, expect, it } from 'vitest';
import schema from '@/instant.schema';

describe('memories schema', () => {
  const entities = (schema as any)._schema?.entities ?? (schema as any).entities;

  it('declares the memories entity with required fields', () => {
    const m = entities.memories;
    expect(m).toBeDefined();
    const attrs = Object.keys(m.attrs ?? m);
    expect(attrs).toEqual(expect.arrayContaining([
      'body', 'kind', 'isPrivate', 'isPinned', 'notifyMembers',
      'reactionCount', 'replyCount', 'repostCount',
      'createdAt', 'updatedAt',
    ]));
  });

  it('declares memoryReactions, memoryAttachments, memoryPolls, memoryPollOptions, memoryPollVotes', () => {
    expect(entities.memoryReactions).toBeDefined();
    expect(entities.memoryAttachments).toBeDefined();
    expect(entities.memoryPolls).toBeDefined();
    expect(entities.memoryPollOptions).toBeDefined();
    expect(entities.memoryPollVotes).toBeDefined();
  });

  it('declares mediaQuotaUsage and aiUsage', () => {
    expect(entities.mediaQuotaUsage).toBeDefined();
    expect(entities.aiUsage).toBeDefined();
  });

  it('extends spaces with plan and memberships with notify* fields', () => {
    const spaceAttrs = Object.keys(entities.spaces.attrs ?? entities.spaces);
    expect(spaceAttrs).toContain('plan');
    const memberAttrs = Object.keys(entities.memberships.attrs ?? entities.memberships);
    expect(memberAttrs).toEqual(expect.arrayContaining([
      'notifyOnPost', 'notifyOnReply', 'notifyOnReaction', 'notifyOnRepost',
    ]));
  });
});
