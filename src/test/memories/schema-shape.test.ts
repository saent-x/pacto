import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import schema from '@/instant.schema';
import { AI_DOMAINS } from '@/src/lib/ai';

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
    const attachmentAttrs = Object.keys(
      entities.memoryAttachments.attrs ?? entities.memoryAttachments,
    );
    expect(attachmentAttrs).toContain('spaceId');
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

  it('links each user to their permanent base solo space', () => {
    const links = (schema as any)._schema?.links ?? (schema as any).links;

    expect(links.userBaseSoloSpace).toMatchObject({
      forward: { on: '$users', has: 'one', label: 'baseSoloSpace' },
      reverse: { on: 'spaces', has: 'many', label: 'baseUsers' },
    });
  });

  it('cascades task list deletion to child tasks so list deletes cannot orphan scoped tasks', () => {
    const links = (schema as any)._schema?.links ?? (schema as any).links;

    expect(links.taskList).toMatchObject({
      forward: { on: 'tasks', has: 'one', label: 'list', onDelete: 'cascade' },
      reverse: { on: 'taskLists', has: 'many', label: 'tasks' },
    });
  });

  it('indexes updatedAt for assistant-readable domains used in bounded context queries', () => {
    const schemaSource = readFileSync('instant.schema.ts', 'utf8');

    for (const domain of AI_DOMAINS) {
      const entityBlock = schemaSource.match(
        new RegExp(`\\n    ${domain}: i\\.entity\\(\\{[\\s\\S]*?\\n    \\}\\),`),
      )?.[0];

      expect(entityBlock).toContain('updatedAt: i.number().optional().indexed()');
    }
  });
});
