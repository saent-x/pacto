import React from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const txCalls = vi.hoisted(() => ({
  links: [] as Array<{ table: string; id: string; payload: any }>,
  deletes: [] as Array<{ table: string; id: string }>,
}));

const dbMock = vi.hoisted(() => ({
  transact: vi.fn(async (op: any) => op),
  queryOnce: vi.fn(),
  tx: {
    memoryReactions: new Proxy({}, {
      get: (_target, rowId: string) => ({
        update: vi.fn(() => ({
          link: vi.fn((payload: any) => {
            txCalls.links.push({ table: 'memoryReactions', id: rowId, payload });
            return { table: 'memoryReactions', id: rowId, payload };
          }),
        })),
        delete: vi.fn(),
      }),
    }),
    memories: new Proxy({}, {
      get: (_target, rowId: string) => ({
        update: vi.fn(() => ({
          link: vi.fn((payload: any) => {
            txCalls.links.push({ table: 'memories', id: rowId, payload });
            return { table: 'memories', id: rowId, payload };
          }),
        })),
        delete: vi.fn(() => {
          txCalls.deletes.push({ table: 'memories', id: rowId });
          return { table: 'memories', id: rowId, delete: true };
        }),
      }),
    }),
    $files: new Proxy({}, {
      get: (_target, rowId: string) => ({
        delete: vi.fn(() => {
          txCalls.deletes.push({ table: '$files', id: rowId });
          return { table: '$files', id: rowId, delete: true };
        }),
      }),
    }),
  },
}));

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
}));

const composerDraftSpy = vi.hoisted(() => ({
  setMemoryComposerDraft: vi.fn(),
}));

const entityRefCardProps = vi.hoisted(() => [] as any[]);

const notificationSpies = vi.hoisted(() => ({
  notifyMemoryReaction: vi.fn(async () => undefined),
  notifyMemoryRepost: vi.fn(async () => undefined),
}));

const sessionState = vi.hoisted(() => ({
  current: {
    activeCouple: { couple: { id: 'shared-1' } },
    sharedSpaceId: 'shared-1',
    sharedSpace: { id: 'shared-1', kind: 'pair' },
    space: { id: 'shared-1', kind: 'pair' },
    mode: 'pair',
    user: { id: 'user-1', displayName: 'Tor' },
  } as any,
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'new-memory-1'),
  lookup: vi.fn((field: string, value: string) => `lookup:${field}:${value}`),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: vi.fn(() => sessionState.current),
}));

vi.mock('@/src/lib/memories/notifications', () => ({
  notifyMemoryReaction: notificationSpies.notifyMemoryReaction,
  notifyMemoryRepost: notificationSpies.notifyMemoryRepost,
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
}));

vi.mock('date-fns', () => ({
  formatDistanceToNowStrict: vi.fn(() => '1 hour'),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#D88B74',
      accent2: '#9C89B8',
      bg: '#FFFFFF',
      bgCard: '#FFFFFF',
      ink2: '#555555',
      ink3: '#777777',
      inkColor: '#222222',
      lineColor: '#EEEEEE',
      line2: '#EFEFEF',
    },
  }),
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <Text testID={`memory-action-icon-${name}`}>{name}</Text>,
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, onPress, style, ...props }: any) => (
    <Pressable {...props} onPress={onPress} style={style}>{children}</Pressable>
  ),
}));

vi.mock('@/src/components/ui/pacto/Avatar', () => ({
  Avatar: () => <Text testID="memory-avatar">avatar</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/MemoriesIcon', () => ({
  MemoriesIcon: ({ name }: { name: string }) => <Text testID={`memory-post-icon-${name}`}>{name}</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/EntityRefCard', () => ({
  EntityRefCard: (props: any) => {
    entityRefCardProps.push(props);
    return <Text testID="entity-ref-card">{props.type}:{props.refId}:{props.spaceId ?? 'none'}</Text>;
  },
}));

vi.mock('@/src/hooks/memories/useMemoryComposer', () => ({
  setMemoryComposerDraft: composerDraftSpy.setMemoryComposerDraft,
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function memoryActionResult(overrides: any = {}) {
  return {
    data: {
      memories: [
        {
          id: 'shared-memory-1',
          isPrivate: false,
          space: [{ id: 'shared-1' }],
          author: { id: 'user-2', displayName: 'Ada' },
          attachments: [],
          ...overrides,
        },
      ],
    },
  };
}

function ownedMemoryActionResult(overrides: any = {}) {
  return memoryActionResult({
    id: 'memory-1',
    author: { id: 'user-1', displayName: 'Tor' },
    ...overrides,
  });
}

function reactionActionResult(overrides: any = {}) {
  return {
    data: {
      memoryReactions: [
        {
          id: 'reaction-1',
          user: { id: 'user-1' },
          memory: {
            id: 'shared-memory-1',
            isPrivate: false,
            space: [{ id: 'shared-1' }],
          },
          ...overrides,
        },
      ],
    },
  };
}

function installDefaultActionQueries() {
  dbMock.queryOnce.mockImplementation(async (query: any) => {
    if (query?.memoryReactions) return reactionActionResult();
    return memoryActionResult({
      id: query?.memories?.$?.where?.id ?? 'shared-memory-1',
      author: { id: 'user-1', displayName: 'Tor' },
    });
  });
}

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | null = null;

  function Probe() {
    latest = useValue();
    return null;
  }

  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
    await flush();
  });

  return { latest: latest!, renderer };
}

describe('private memory actions', () => {
  beforeEach(() => {
    txCalls.links = [];
    txCalls.deletes = [];
    entityRefCardProps.length = 0;
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockReset();
    notificationSpies.notifyMemoryReaction.mockClear();
    notificationSpies.notifyMemoryRepost.mockClear();
    installDefaultActionQueries();
    sessionState.current = {
      activeCouple: { couple: { id: 'shared-1' } },
      sharedSpaceId: 'shared-1',
      sharedSpace: { id: 'shared-1', kind: 'pair' },
      space: { id: 'shared-1', kind: 'pair' },
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor' },
    };
  });

  it('hides shared/social actions when a private memory is rendered through MemoryActions', async () => {
    const { MemoryActions } = await import('@/src/components/ui/pacto/memories/MemoryActions');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryActions
          mode="pair"
          reactionCount={0}
          replyCount={0}
          repostCount={0}
          canReact={false}
          canRepost={false}
          canShare={false}
        />,
      );
      await flush();
    });

    expect(renderer.root.findAllByProps({ testID: 'memory-action-icon-messageCircle' })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: 'memory-action-icon-heart' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'memory-action-icon-repeat' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'memory-action-icon-send' })).toHaveLength(0);

    act(() => renderer.unmount());
  });

  it('renders private memory posts without react, repost, or external share actions', async () => {
    const { MemoryPost } = await import('@/src/components/ui/pacto/memories/MemoryPost');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPost
          variant="feed"
          memory={{
            id: 'private-memory-1',
            body: 'for me',
            kind: 'post',
            createdAt: Date.now(),
            isPrivate: true,
            author: { id: 'user-1', displayName: 'Tor' },
          }}
        />,
      );
      await flush();
    });

    expect(renderer.root.findAllByProps({ testID: 'memory-post-icon-reply' })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: 'memory-post-icon-heart' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'memory-post-icon-repost' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'memory-post-icon-send' })).toHaveLength(0);

    act(() => renderer.unmount());
  });

  it('ignores duplicate memory delete confirmations while removal is pending', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let releaseRemove: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseRemove = resolve;
        }),
    );
    const { MemoryPost } = await import('@/src/components/ui/pacto/memories/MemoryPost');
    let renderer: any;
    try {
      await act(async () => {
        renderer = TestRenderer.create(
          <MemoryPost
            variant="feed"
            memory={{
              id: 'memory-to-delete',
              body: 'remove me',
              kind: 'post',
              createdAt: Date.now(),
              isPrivate: false,
              author: { id: 'user-1', displayName: 'Tor' },
            }}
          />,
        );
        await flush();
      });

      await act(async () => {
        renderer.root.findByProps({ accessibilityLabel: 'Post options' }).props.onPress();
        await flush();
      });

      const [, , optionButtons] = alertSpy.mock.calls[0];
      const deleteOption = optionButtons.find((button: any) => button.text === 'Delete');
      await act(async () => {
        deleteOption.onPress();
        await flush();
      });

      const [, , confirmButtons] = alertSpy.mock.calls[1];
      const destructive = confirmButtons.find((button: any) => button.style === 'destructive');
      let firstPress: Promise<void> | undefined;
      let secondPress: Promise<void> | undefined;
      await act(async () => {
        firstPress = destructive.onPress();
        secondPress = destructive.onPress();
        await Promise.resolve();
      });

      expect(dbMock.transact).toHaveBeenCalledTimes(1);
      releaseRemove?.();
      await act(async () => {
        await Promise.all([firstPress, secondPress]);
        await flush();
      });
    } finally {
      alertSpy.mockRestore();
      if (renderer) act(() => renderer.unmount());
    }
  });

  it('scopes feed entity attachments to the current memory space', async () => {
    const { MemoryPost } = await import('@/src/components/ui/pacto/memories/MemoryPost');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryPost
          variant="feed"
          memory={{
            id: 'shared-memory-1',
            body: 'shared context',
            kind: 'post',
            createdAt: Date.now(),
            isPrivate: false,
            author: { id: 'user-1', displayName: 'Tor' },
            space: [{ id: 'shared-1' }],
            attachments: [
              {
                id: 'attachment-1',
                type: 'task',
                refId: 'task-1',
                spaceId: 'stale-solo-1',
              },
            ],
          } as any}
        />,
      );
      await flush();
    });

    expect(entityRefCardProps).toContainEqual(
      expect.objectContaining({
        type: 'task',
        refId: 'task-1',
        spaceId: 'shared-1',
      }),
    );

    act(() => renderer.unmount());
  });

  it('does not repost private memories into the active shared space', async () => {
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await latest.repost('private-memory-1', { isPrivate: true });
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.links).toEqual([]);

    act(() => renderer.unmount());
  });

  it('fails closed before reacting to a memory outside scoped spaces', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({ data: { memories: [] } });
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await expect(latest.react('outside-memory-1', 'heart', { isPrivate: false })).rejects.toThrow('Memory not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(notificationSpies.notifyMemoryReaction).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('fails closed before social actions on stale public personal-space memories', async () => {
    sessionState.current = {
      ...sessionState.current,
      personalSpaceId: 'solo-1',
    };
    dbMock.queryOnce.mockResolvedValue(memoryActionResult({
      id: 'legacy-personal-memory',
      isPrivate: false,
      space: [{ id: 'solo-1' }],
      author: { id: 'user-1', displayName: 'Tor' },
    }));
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await expect(latest.react('legacy-personal-memory', 'heart', { isPrivate: false })).rejects.toThrow('Memory not found');
      await expect(latest.repost('legacy-personal-memory', { isPrivate: false })).rejects.toThrow('Memory not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(notificationSpies.notifyMemoryReaction).not.toHaveBeenCalled();
    expect(notificationSpies.notifyMemoryRepost).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('ignores duplicate reaction requests while the first reaction is pending', async () => {
    let releaseReaction: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseReaction = resolve;
        }),
    );
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    let firstReact: Promise<void> | undefined;
    let secondReact: Promise<void> | undefined;
    await act(async () => {
      firstReact = latest.react('shared-memory-1', 'heart', { isPrivate: false });
      secondReact = latest.react('shared-memory-1', 'heart', { isPrivate: false });
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseReaction?.();
    await act(async () => {
      await Promise.all([firstReact, secondReact]);
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('ignores duplicate unreact requests while the first reaction delete is pending', async () => {
    let releaseUnreact: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseUnreact = resolve;
        }),
    );
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    let firstUnreact: Promise<void> | undefined;
    let secondUnreact: Promise<void> | undefined;
    await act(async () => {
      firstUnreact = latest.unreact('reaction-1');
      secondUnreact = latest.unreact('reaction-1');
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseUnreact?.();
    await act(async () => {
      await Promise.all([firstUnreact, secondUnreact]);
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('fails closed before deleting another user reaction', async () => {
    dbMock.queryOnce.mockResolvedValueOnce(reactionActionResult({ user: { id: 'user-2' } }));
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await expect(latest.unreact('reaction-2')).rejects.toThrow('Reaction not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('still reposts shared memories to the active shared space', async () => {
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await latest.repost('shared-memory-1', { isPrivate: false });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'memories',
      id: 'new-memory-1',
      payload: { space: 'shared-1', author: 'user-1', repostOf: 'shared-memory-1' },
    });

    act(() => renderer.unmount());
  });

  it('ignores duplicate repost requests while the first repost is pending', async () => {
    let releaseRepost: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseRepost = resolve;
        }),
    );
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    let firstRepost: Promise<void> | undefined;
    let secondRepost: Promise<void> | undefined;
    await act(async () => {
      firstRepost = latest.repost('shared-memory-1', { isPrivate: false });
      secondRepost = latest.repost('shared-memory-1', { isPrivate: false });
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseRepost?.();
    await act(async () => {
      await Promise.all([firstRepost, secondRepost]);
      await flush();
    });

    act(() => renderer.unmount());
  });

  it('reposts shared memories with canonical sharedSpaceId when legacy activeCouple is absent', async () => {
    sessionState.current = {
      activeCouple: null,
      sharedSpaceId: 'shared-1',
      sharedSpace: { id: 'shared-1', kind: 'pair' },
      space: { id: 'shared-1', kind: 'pair' },
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor' },
    };
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await latest.repost('shared-memory-1', { isPrivate: false });
      await flush();
    });

    expect(txCalls.links[0]).toEqual({
      table: 'memories',
      id: 'new-memory-1',
      payload: { space: 'shared-1', author: 'user-1', repostOf: 'shared-memory-1' },
    });

    act(() => renderer.unmount());
  });

  it('deletes owner-scoped memory media files when removing a post', async () => {
    dbMock.queryOnce.mockResolvedValueOnce(ownedMemoryActionResult({
      attachments: [
        { mediaPath: 'users/user-1/spaces/shared-1/memories/owned.jpg' },
        { mediaPath: 'users/user-2/spaces/shared-1/memories/theirs.jpg' },
        { mediaPath: 'spaces/shared-1/memories/legacy.jpg' },
        { mediaPath: null },
      ],
    }));
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await latest.remove('memory-1');
      await flush();
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith({
      memories: {
        $: { where: { id: 'memory-1', 'space.id': 'shared-1' }, limit: 1 },
        space: {},
        author: {},
        attachments: {},
      },
    });
    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$files',
        id: 'lookup:path:users/user-1/spaces/shared-1/memories/owned.jpg',
        delete: true,
      },
      { table: 'memories', id: 'memory-1', delete: true },
    ]);
    expect(txCalls.deletes).toEqual([
      {
        table: '$files',
        id: 'lookup:path:users/user-1/spaces/shared-1/memories/owned.jpg',
      },
      { table: 'memories', id: 'memory-1' },
    ]);

    act(() => renderer.unmount());
  });

  it('fails closed before removing a memory outside scoped spaces', async () => {
    dbMock.queryOnce.mockResolvedValueOnce({ data: { memories: [] } });
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await expect(latest.remove('outside-memory-1')).rejects.toThrow('Memory not found');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.deletes).toEqual([]);

    act(() => renderer.unmount());
  });

  it('fails closed before removing a memory not owned by the current user', async () => {
    dbMock.queryOnce.mockResolvedValueOnce(memoryActionResult({
      id: 'memory-2',
      author: { id: 'user-2', displayName: 'Ada' },
      attachments: [
        { mediaPath: 'users/user-2/spaces/shared-1/memories/theirs.jpg' },
      ],
    }));
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await expect(latest.remove('memory-2')).rejects.toThrow('Memory not owned');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.deletes).toEqual([]);

    act(() => renderer.unmount());
  });

  it('fails closed before pinning a memory not owned by the current user', async () => {
    dbMock.queryOnce.mockResolvedValueOnce(memoryActionResult({
      id: 'memory-2',
      author: { id: 'user-2', displayName: 'Ada' },
    }));
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    await act(async () => {
      await expect(latest.togglePin('memory-2', false)).rejects.toThrow('Memory not owned');
      await flush();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('ignores duplicate memory remove requests while cleanup is pending', async () => {
    let releaseRemove: (() => void) | undefined;
    dbMock.queryOnce.mockResolvedValue(ownedMemoryActionResult({
      attachments: [
        { mediaPath: 'users/user-1/spaces/shared-1/memories/owned.jpg' },
      ],
    }));
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseRemove = resolve;
        }),
    );
    const { useMemoryActions } = await import('@/src/hooks/memories/useMemoryActions');
    const { latest, renderer } = await renderHookValue(() => useMemoryActions());

    let firstRemove: Promise<void> | undefined;
    let secondRemove: Promise<void> | undefined;
    await act(async () => {
      firstRemove = latest.remove('memory-1');
      secondRemove = latest.remove('memory-1');
      await Promise.resolve();
    });

    expect(dbMock.queryOnce).toHaveBeenCalledTimes(1);
    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseRemove?.();
    await act(async () => {
      await Promise.all([firstRemove, secondRemove]);
      await flush();
    });

    act(() => renderer.unmount());
  });
});
