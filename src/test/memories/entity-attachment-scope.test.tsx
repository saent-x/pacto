import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

const useQueryMock = vi.hoisted(() => vi.fn(() => ({ data: {}, isLoading: false })));

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: useQueryMock,
  },
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    user: { id: 'user-1' },
    space: { id: 'shared-1' },
    activeCouple: { couple: { id: 'shared-1' } },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
  }),
}));

import { useEntityAttachment, type AttachableEntity } from '@/src/hooks/memories/useEntityAttachment';

function AttachmentProbe({ targetSpaceId }: { targetSpaceId?: string }) {
  useEntityAttachment('journal', { targetSpaceId });
  return null;
}

function TaskAttachmentProbe({ onEntities }: { onEntities: (entities: any[]) => void }) {
  const { entities } = useEntityAttachment('task');
  onEntities(entities);
  return null;
}

function EntityAttachmentProbe({
  type,
  onEntities,
}: {
  type: AttachableEntity;
  onEntities: (entities: any[]) => void;
}) {
  const { entities } = useEntityAttachment(type);
  onEntities(entities);
  return null;
}

describe('useEntityAttachment space scope', () => {
  it('queries both permanent personal and active shared spaces when no target space is supplied', () => {
    act(() => {
      create(<AttachmentProbe />);
    });

    expect(useQueryMock).toHaveBeenCalledWith({
      journalEntries: {
        $: {
          where: {
            or: [
              { 'couple.id': 'solo-1' },
              { 'couple.id': 'shared-1' },
            ],
          },
          order: { createdAt: 'desc' },
          limit: 30,
        },
        couple: {},
        author: {},
      },
    });
  });

  it('queries only the composer target space so shared memories cannot attach personal rows', () => {
    useQueryMock.mockClear();

    act(() => {
      create(<AttachmentProbe targetSpaceId="shared-1" />);
    });

    expect(useQueryMock).toHaveBeenCalledWith({
      journalEntries: {
        $: {
          where: { 'couple.id': 'shared-1' },
          order: { createdAt: 'desc' },
          limit: 30,
        },
        couple: {},
        author: {},
      },
    });
  });

  it('filters task attachments whose direct space differs from their parent list space', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: 'valid-task',
            couple: { id: 'solo-1' },
            list: { id: 'list-1', couple: { id: 'solo-1' } },
          },
          {
            id: 'cross-space-task',
            couple: { id: 'solo-1' },
            list: { id: 'list-2', couple: { id: 'shared-1' } },
          },
        ],
      },
    });
    const seen: any[][] = [];

    act(() => {
      create(<TaskAttachmentProbe onEntities={(entities) => seen.push(entities)} />);
    });

    expect(useQueryMock).toHaveBeenCalledWith({
      tasks: {
        $: {
          where: {
            or: [
              { 'couple.id': 'solo-1' },
              { 'couple.id': 'shared-1' },
            ],
          },
          order: { createdAt: 'desc' },
          limit: 30,
        },
        couple: {},
        list: { couple: {} },
        createdBy: {},
      },
    });
    expect(seen.at(-1)?.map((entity) => entity.id)).toEqual(['valid-task']);
  });

  it('filters task attachments whose parent list is unresolved', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: 'orphaned-task',
            couple: { id: 'solo-1' },
            list: { id: 'list-1' },
          },
        ],
      },
    });
    const seen: any[][] = [];

    act(() => {
      create(<TaskAttachmentProbe onEntities={(entities) => seen.push(entities)} />);
    });

    expect(seen.at(-1)).toEqual([]);
  });

  it('uses parent list space for legacy task attachment visibility', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: 'legacy-personal-self-task',
            list: { id: 'personal-list', couple: { id: 'solo-1' } },
            createdBy: { id: 'user-1' },
          },
          {
            id: 'legacy-personal-partner-task',
            list: { id: 'partner-personal-list', couple: { id: 'solo-1' } },
            createdBy: { id: 'partner-1' },
          },
          {
            id: 'legacy-shared-task',
            list: { id: 'shared-list', couple: { id: 'shared-1' } },
            createdBy: { id: 'partner-1' },
          },
        ],
      },
    });
    const seen: any[][] = [];

    act(() => {
      create(<TaskAttachmentProbe onEntities={(entities) => seen.push(entities)} />);
    });

    expect(seen.at(-1)?.map((entity) => entity.id)).toEqual([
      'legacy-personal-self-task',
      'legacy-shared-task',
    ]);
  });

  it.each([
    ['task', 'tasks', 'createdBy'],
    ['reminder', 'reminders', 'createdBy'],
    ['plan', 'plans', 'createdBy'],
    ['checkIn', 'checkIns', 'author'],
    ['timetable', 'timetables', 'createdBy'],
    ['journal', 'journalEntries', 'author'],
  ] as const)('excludes partner-authored personal-space %s attachments', (type, collection, ownerLink) => {
    const withTaskList = (row: any) =>
      type === 'task' ? { ...row, list: { id: `${row.id}-list`, couple: row.couple } } : row;
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        [collection]: [
          withTaskList({
            id: `${type}-personal-partner`,
            couple: { id: 'solo-1' },
            [ownerLink]: { id: 'partner-1' },
          }),
          withTaskList({
            id: `${type}-personal-self`,
            couple: { id: 'solo-1' },
            [ownerLink]: { id: 'user-1' },
          }),
          withTaskList({
            id: `${type}-shared-partner`,
            couple: { id: 'shared-1' },
            [ownerLink]: { id: 'partner-1' },
          }),
        ],
      },
    });
    const seen: any[][] = [];

    act(() => {
      create(<EntityAttachmentProbe type={type} onEntities={(entities) => seen.push(entities)} />);
    });

    expect(seen.at(-1)?.map((entity) => entity.id)).toEqual([
      `${type}-personal-self`,
      `${type}-shared-partner`,
    ]);
  });
});
