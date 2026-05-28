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
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
  }),
}));

import {
  type EntityRefKind,
  resolveEntityRefScopeId,
  useEntityRef,
} from '@/src/hooks/memories/useEntityRef';

const taskId = '11111111-1111-4111-8111-111111111111';

function RefProbe({ spaceId }: { spaceId?: string }) {
  useEntityRef('task', taskId, spaceId);
  return null;
}

function RefResultProbe({ spaceId, onEntity }: { spaceId?: string; onEntity: (entity: any) => void }) {
  const { entity } = useEntityRef('task', taskId, spaceId);
  onEntity(entity);
  return null;
}

function EntityRefResultProbe({
  type,
  spaceId,
  onEntity,
}: {
  type: EntityRefKind;
  spaceId?: string;
  onEntity: (entity: any) => void;
}) {
  const { entity } = useEntityRef(type, taskId, spaceId);
  onEntity(entity);
  return null;
}

describe('useEntityRef space scope', () => {
  it('prefers the current memory space over stale persisted attachment scope', () => {
    expect(resolveEntityRefScopeId('solo-1', 'old-shared-1')).toBe('solo-1');
    expect(resolveEntityRefScopeId(null, 'shared-1')).toBe('shared-1');
    expect(resolveEntityRefScopeId(undefined, undefined)).toBeNull();
  });

  it('scopes attached entity lookups to the attachment space when supplied', () => {
    act(() => {
      create(<RefProbe spaceId="shared-1" />);
    });

    expect(useQueryMock).toHaveBeenCalledWith({
      tasks: {
        $: {
          where: {
            id: taskId,
            'couple.id': 'shared-1',
          },
          limit: 1,
        },
        couple: {},
        list: { couple: {} },
        createdBy: {},
      },
    });
  });

  it('does not render task refs whose parent list belongs to a different space', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: taskId,
            couple: { id: 'shared-1' },
            list: { id: 'list-1', couple: { id: 'solo-1' } },
          },
        ],
      },
    });
    const seen: any[] = [];

    act(() => {
      create(<RefResultProbe spaceId="shared-1" onEntity={(entity) => seen.push(entity)} />);
    });

    expect(seen.at(-1)).toBeNull();
  });

  it('does not render task refs whose parent list is unresolved', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: taskId,
            couple: { id: 'shared-1' },
            list: { id: 'list-1' },
          },
        ],
      },
    });
    const seen: any[] = [];

    act(() => {
      create(<RefResultProbe spaceId="shared-1" onEntity={(entity) => seen.push(entity)} />);
    });

    expect(seen.at(-1)).toBeNull();
  });

  it('uses parent list space for legacy personal task refs', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: taskId,
            list: { id: 'list-1', couple: { id: 'solo-1' } },
            createdBy: { id: 'user-1' },
          },
        ],
      },
    });
    const seen: any[] = [];

    act(() => {
      create(<RefResultProbe spaceId="solo-1" onEntity={(entity) => seen.push(entity)} />);
    });

    expect(seen.at(-1)).toEqual(expect.objectContaining({ id: taskId }));
  });

  it('does not render partner-authored legacy personal task refs', () => {
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: {
        tasks: [
          {
            id: taskId,
            list: { id: 'list-1', couple: { id: 'solo-1' } },
            createdBy: { id: 'partner-1' },
          },
        ],
      },
    });
    const seen: any[] = [];

    act(() => {
      create(<RefResultProbe spaceId="solo-1" onEntity={(entity) => seen.push(entity)} />);
    });

    expect(seen.at(-1)).toBeNull();
  });

  it.each([
    ['task', 'tasks', 'createdBy'],
    ['reminder', 'reminders', 'createdBy'],
    ['plan', 'plans', 'createdBy'],
    ['checkIn', 'checkIns', 'author'],
    ['timetable', 'timetables', 'createdBy'],
    ['journal', 'journalEntries', 'author'],
  ] as const)('does not render partner-authored personal-space %s refs', (type, collection, ownerLink) => {
    const row: any = {
      id: taskId,
      couple: { id: 'solo-1' },
      [ownerLink]: { id: 'partner-1' },
    };
    if (type === 'task') {
      row.list = { id: 'list-1', couple: { id: 'solo-1' } };
    }
    useQueryMock.mockReturnValueOnce({
      isLoading: false,
      data: { [collection]: [row] },
    });
    const seen: any[] = [];

    act(() => {
      create(<EntityRefResultProbe type={type} spaceId="solo-1" onEntity={(entity) => seen.push(entity)} />);
    });

    expect(seen.at(-1)).toBeNull();
  });
});
