import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, vi, describe, expect, it } from 'vitest';

// useMemoryComposer imports db/useSession at module scope; mock them so the
// pure validateComposerDraft function can be imported without env variables.
const dbMock = vi.hoisted(() => ({
  transact: vi.fn(async (_ops: any) => undefined),
  queryOnce: vi.fn(async (_query: any) => ({ data: {} })),
  getAuth: vi.fn(async () => null),
  useQuery: vi.fn(() => ({ isLoading: false, error: null, data: {} })),
}));
const pushMock = vi.hoisted(() => ({
  notifySpaceMutation: vi.fn(async () => undefined),
}));
const memoryNotificationMock = vi.hoisted(() => ({
  notifyMemoryQuote: vi.fn(async () => undefined),
}));
const sessionMock = vi.hoisted(() => ({
  current: { user: null, activeCouple: null, space: null } as any,
}));

vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: dbMock.useQuery,
    transact: dbMock.transact,
    queryOnce: dbMock.queryOnce,
    getAuth: dbMock.getAuth,
    tx: new Proxy(
      {},
      {
        get: (_target, table: string) =>
          new Proxy(
            {},
            {
              get: (_entityTarget, entityId: string) => ({
                delete: () => ({ table, entityId, type: 'delete' }),
                update: (data: any) => ({
                  table,
                  entityId,
                  type: 'update',
                  data,
                  link: (links: any) => ({
                    table,
                    entityId,
                    type: 'update',
                    data,
                    links,
                  }),
                }),
              }),
            },
          ),
      },
    ),
  },
  id: () => 'mock-id',
  lookup: (field: string, value: string) => {
    const ref = { field, value };
    Object.defineProperty(ref, 'toString', {
      enumerable: false,
      value: () => `lookup:${field}:${value}`,
    });
    return ref;
  },
}));
vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionMock.current,
}));
vi.mock('@/src/lib/push', () => ({
  notifySpaceMutation: pushMock.notifySpaceMutation,
}));
vi.mock('@/src/lib/memories/notifications', () => ({
  notifyMemoryQuote: memoryNotificationMock.notifyMemoryQuote,
}));

import {
  addMemoryDraftAttachment,
  buildMemoryEditUpdate,
  canSubmitComposerDraft,
  deleteOwnedDraftMediaPath,
  getMemoryComposerDraft,
  removeMemoryDraftAttachmentAt,
  resolveMemoryDraftAttachmentScopeId,
  resolveComposerSpace,
  setMemoryComposerDraft,
  setMemoryComposerPrivacy,
  sumDraftMediaBytes,
  resolveComposerTargetSpace,
  useMemoryComposer,
  validateComposerDraft,
} from '@/src/hooks/memories/useMemoryComposer';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  dbMock.getAuth.mockReset();
});

const baseSpace = { id: 's1', kind: 'pair' as const, plan: 'free' as const };
const validMemoryId = '55555555-5555-4555-8555-555555555555';
const validEntityId = '66666666-6666-4666-8666-666666666666';

async function renderHookValue<T>(useValue: () => T) {
  let latest: T | undefined;
  function HookHost() {
    latest = useValue();
    return null;
  }
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(HookHost));
  });
  return {
    get latest() {
      return latest as T;
    },
    renderer: renderer!,
  };
}

describe('validateComposerDraft', () => {
  it('rejects empty body with no attachments', () => {
    const r = validateComposerDraft({ body: '   ', attachments: [], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(false);
  });
  it('accepts body-only', () => {
    const r = validateComposerDraft({ body: 'hi', attachments: [], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(true);
  });
  it('accepts media-only', () => {
    const r = validateComposerDraft({ body: '', attachments: [{ type: 'image' }], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(true);
  });
  it('rejects poll on free plan in pair space (poll allowed only in crew)', () => {
    const r = validateComposerDraft({ body: 'q', attachments: [], pollOptions: ['a','b'], mode: 'post' }, { ...baseSpace, kind: 'pair' });
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/poll/i);
  });
  it('accepts poll in crew', () => {
    const r = validateComposerDraft({ body: 'q', attachments: [], pollOptions: ['a','b'], mode: 'post' }, { ...baseSpace, kind: 'crew' });
    expect(r.ok).toBe(true);
  });
  it('allows submitting a valid poll-only memory in a crew space', () => {
    expect(
      canSubmitComposerDraft(
        { body: '  ', attachments: [], pollOptions: ['A', 'B'], mode: 'post' },
        { ...baseSpace, kind: 'crew' },
      ),
    ).toBe(true);
  });
  it('builds memory edit updates without changing kind or privacy', () => {
    expect(
      buildMemoryEditUpdate(
        {
          body: '  Updated #Trip note  ',
          attachments: [],
          pollOptions: [],
          mode: 'edit',
          editId: 'memory-1',
          editKind: 'post',
          isPrivate: true,
        },
        1234,
      ),
    ).toEqual({
      body: 'Updated #Trip note',
      tags: ['trip'],
      kind: 'post',
      isPrivate: true,
      updatedAt: 1234,
    });
  });
  it('does not allow edit submit before the original memory kind is loaded', () => {
    expect(
      canSubmitComposerDraft(
        {
          body: 'Updated',
          attachments: [],
          pollOptions: [],
          mode: 'edit',
          editId: 'memory-1',
        },
        baseSpace,
      ),
    ).toBe(false);
  });

  it('does not allow malformed reply, quote, or edit ids to submit', () => {
    expect(
      canSubmitComposerDraft(
        {
          body: 'Reply',
          attachments: [],
          pollOptions: [],
          mode: 'reply',
          parentId: 'not-a-uuid',
        },
        baseSpace,
      ),
    ).toBe(false);
    expect(
      canSubmitComposerDraft(
        {
          body: 'Quote',
          attachments: [],
          pollOptions: [],
          mode: 'quote',
          quoteId: 'not-a-uuid',
        },
        baseSpace,
      ),
    ).toBe(false);
    expect(
      canSubmitComposerDraft(
        {
          body: 'Edit',
          attachments: [],
          pollOptions: [],
          mode: 'edit',
          editId: 'not-a-uuid',
          editKind: 'post',
        },
        baseSpace,
      ),
    ).toBe(false);
  });
  it('rejects blank poll options as empty content instead of creating empty choices', () => {
    const r = validateComposerDraft({ body: '  ', attachments: [], pollOptions: ['  ', ''], mode: 'post' }, { ...baseSpace, kind: 'crew' });
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/text, media, or a poll/i);
  });
  it('requires at least two distinct poll options', () => {
    const r = validateComposerDraft({ body: 'vote', attachments: [], pollOptions: ['Yes', ' yes ', ''], mode: 'post' }, { ...baseSpace, kind: 'crew' });
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/two distinct/i);
  });
  it('rejects video attachment on free plan', () => {
    const r = validateComposerDraft({ body: '', attachments: [{ type: 'video' }], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/video/i);
  });

  it('rejects entity attachments from a different space than the memory target', () => {
    const r = validateComposerDraft(
      {
        body: 'shared context',
        attachments: [{ type: 'task', refId: validEntityId, spaceId: 'solo-1' }],
        pollOptions: [],
        mode: 'post',
      },
      { id: 'shared-1', kind: 'pair' },
    );

    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/same space/i);
  });

  it('rejects malformed entity attachment ids before submit', () => {
    const r = validateComposerDraft(
      {
        body: 'shared context',
        attachments: [{ type: 'task', refId: 'not-a-uuid', spaceId: 'shared-1' }],
        pollOptions: [],
        mode: 'post',
      },
      { id: 'shared-1', kind: 'pair' },
    );

    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/attachment.*id/i);
  });

  it('rejects entity attachments without ids before submit', () => {
    const r = validateComposerDraft(
      {
        body: 'shared context',
        attachments: [{ type: 'task', spaceId: 'shared-1' }],
        pollOptions: [],
        mode: 'post',
      },
      { id: 'shared-1', kind: 'pair' },
    );

    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/attachment.*id/i);
  });

  it('accepts private memories in solo spaces because solo is the personal base', () => {
    const r = validateComposerDraft(
      { body: 'only me', attachments: [], pollOptions: [], mode: 'post', isPrivate: true },
      { id: 'solo-1', kind: 'solo' },
    );
    expect(r.ok).toBe(true);
  });

  it('scopes composer attachment previews to the current target space before stale attachment metadata', () => {
    expect(resolveMemoryDraftAttachmentScopeId('shared-1', 'stale-solo-1')).toBe('shared-1');
    expect(resolveMemoryDraftAttachmentScopeId(null, 'solo-1')).toBe('solo-1');
    expect(resolveMemoryDraftAttachmentScopeId(undefined, undefined)).toBeNull();
  });

  it('resolves composer space from canonical session space before legacy activeCouple', () => {
    expect(
      resolveComposerSpace({
        mode: 'pair',
        space: { id: 'space-1', kind: 'crew', plan: 'pro' },
        activeCouple: { couple: { id: 'legacy-space' } },
      }),
    ).toEqual({ id: 'space-1', kind: 'crew', plan: 'pro' });
  });

  it('falls back to session mode when legacy activeCouple lacks kind', () => {
    expect(
      resolveComposerSpace({
        mode: 'crew',
        activeCouple: { couple: { id: 'space-1' } },
      }),
    ).toEqual({ id: 'space-1', kind: 'crew', plan: null });
  });

  it('routes private composer drafts to the permanent solo space while shared drafts use the active pact', () => {
    const session = {
      mode: 'pair',
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'pro' },
      space: { id: 'shared-1', kind: 'pair', plan: 'pro' },
    };

    expect(
      resolveComposerTargetSpace(session, {
        body: 'private',
        attachments: [],
        pollOptions: [],
        mode: 'post',
        isPrivate: true,
      }),
    ).toEqual({ id: 'solo-1', kind: 'solo', plan: 'free' });
    expect(
      resolveComposerTargetSpace(session, {
        body: 'shared',
        attachments: [],
        pollOptions: [],
        mode: 'post',
      }),
    ).toEqual({ id: 'shared-1', kind: 'pair', plan: 'pro' });
  });

  it('does not borrow shared-space kind or plan for private composer drafts when solo relation data is missing', () => {
    const session = {
      mode: 'crew',
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
      sharedSpace: { id: 'shared-1', kind: 'crew', plan: 'pro' },
      space: { id: 'shared-1', kind: 'crew', plan: 'pro' },
    };

    expect(
      resolveComposerTargetSpace(session, {
        body: 'private',
        attachments: [],
        pollOptions: [],
        mode: 'post',
        isPrivate: true,
      }),
    ).toEqual({ id: 'solo-1', kind: 'solo', plan: null });
  });

  it('stores picked entity attachments in the shared composer draft and dedupes them', () => {
    setMemoryComposerDraft({ body: 'typed already', attachments: [], pollOptions: [], mode: 'post' });

    addMemoryDraftAttachment({ type: 'task', refId: validEntityId });
    addMemoryDraftAttachment({ type: 'task', refId: validEntityId });

    expect(getMemoryComposerDraft()).toMatchObject({
      body: 'typed already',
      attachments: [{ type: 'task', refId: validEntityId }],
    });
  });

  it('sums only positive media attachment bytes for quota checks', () => {
    expect(
      sumDraftMediaBytes([
        { type: 'image', mediaSize: 1024 },
        { type: 'gif', mediaSize: 2048 },
        { type: 'task', refId: validEntityId },
        { type: 'image', mediaSize: -1 },
      ]),
    ).toBe(3072);
  });

  it('deletes an owner-scoped uploaded media path before adding over-quota drafts', async () => {
    dbMock.transact.mockClear();

    await deleteOwnedDraftMediaPath('users/user-1/spaces/shared-1/memories/over.jpg', 'user-1');
    await deleteOwnedDraftMediaPath('users/user-2/spaces/shared-1/memories/theirs.jpg', 'user-1');

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$files',
        entityId: 'lookup:path:users/user-1/spaces/shared-1/memories/over.jpg',
        type: 'delete',
      },
    ]);
  });

  it('deletes an owner-scoped uploaded file when a draft media attachment is removed', async () => {
    dbMock.transact.mockClear();
    setMemoryComposerDraft({
      body: 'draft',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/owned.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/owned.jpg',
        },
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/theirs.jpg',
          mediaPath: 'users/user-2/spaces/shared-1/memories/theirs.jpg',
        },
      ],
      pollOptions: [],
      mode: 'post',
    });

    const removed = await removeMemoryDraftAttachmentAt(0, 'user-1');

    expect(removed?.mediaPath).toBe('users/user-1/spaces/shared-1/memories/owned.jpg');
    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$files',
        entityId: 'lookup:path:users/user-1/spaces/shared-1/memories/owned.jpg',
        type: 'delete',
      },
    ]);
    expect(getMemoryComposerDraft().attachments).toEqual([
      {
        type: 'image',
        mediaUrl: 'https://cdn.pacto.test/theirs.jpg',
        mediaPath: 'users/user-2/spaces/shared-1/memories/theirs.jpg',
      },
    ]);
  });

  it('clears uploaded draft media and cross-space entity refs when privacy changes', async () => {
    dbMock.transact.mockClear();
    setMemoryComposerDraft({
      body: 'draft',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/shared.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/shared.jpg',
        },
        { type: 'task', refId: validEntityId, spaceId: 'shared-1' },
        { type: 'journal', refId: validMemoryId, spaceId: 'solo-1' },
        { type: 'plan', refId: 'legacy-without-space' },
      ],
      pollOptions: [],
      mode: 'post',
      isPrivate: false,
      notifyMembers: true,
    });

    const result = await setMemoryComposerPrivacy(true, 'user-1', 'solo-1');

    expect(result.removedMediaCount).toBe(1);
    expect(result.removedEntityRefCount).toBe(1);
    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$files',
        entityId: 'lookup:path:users/user-1/spaces/shared-1/memories/shared.jpg',
        type: 'delete',
      },
    ]);
    expect(getMemoryComposerDraft()).toMatchObject({
      body: 'draft',
      attachments: [
        { type: 'journal', refId: validMemoryId, spaceId: 'solo-1' },
        { type: 'plan', refId: 'legacy-without-space' },
      ],
      isPrivate: true,
      notifyMembers: false,
    });
  });

  it('keeps uploaded draft media when selecting the current visibility again', async () => {
    dbMock.transact.mockClear();
    setMemoryComposerDraft({
      body: 'draft',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/shared.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/shared.jpg',
        },
      ],
      pollOptions: [],
      mode: 'post',
      isPrivate: false,
      notifyMembers: true,
    });

    const result = await setMemoryComposerPrivacy(false, 'user-1');

    expect(result.removedMediaCount).toBe(0);
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(getMemoryComposerDraft()).toMatchObject({
      body: 'draft',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/shared.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/shared.jpg',
        },
      ],
      isPrivate: false,
      notifyMembers: true,
    });
  });

  it('stores solo composer posts as private and does not notify members', async () => {
    dbMock.transact.mockClear();
    pushMock.notifySpaceMutation.mockClear();
    memoryNotificationMock.notifyMemoryQuote.mockClear();
    sessionMock.current = {
      mode: 'solo',
      user: { id: 'user-1', displayName: 'Solo User', email: 'solo@example.test' },
      activeCouple: { couple: { id: 'solo-1', kind: 'solo', plan: 'free' } },
      space: { id: 'solo-1', kind: 'solo', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: null,
    };
    setMemoryComposerDraft({
      body: 'Solo memory',
      attachments: [],
      pollOptions: [],
      mode: 'post',
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await act(async () => {
      await latest.submit();
    });

    const ops = dbMock.transact.mock.calls.at(-1)?.[0] ?? [];
    expect(ops[0]).toMatchObject({
      table: 'memories',
      data: {
        body: 'Solo memory',
        isPrivate: true,
        notifyMembers: false,
      },
      links: {
        space: 'solo-1',
        author: 'user-1',
      },
    });
    act(() => renderer.unmount());
  });

  it('ignores duplicate memory submits while the first post is pending', async () => {
    dbMock.transact.mockClear();
    pushMock.notifySpaceMutation.mockClear();
    memoryNotificationMock.notifyMemoryQuote.mockClear();
    let releaseTransact: (() => void) | undefined;
    dbMock.transact.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseTransact = resolve;
        }),
    );
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'One memory only',
      attachments: [],
      pollOptions: [],
      mode: 'post',
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());
    let firstSubmit: Promise<void> | undefined;
    let secondSubmit: Promise<void> | undefined;

    await act(async () => {
      firstSubmit = latest.submit();
      secondSubmit = latest.submit();
      await Promise.resolve();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);
    releaseTransact?.();
    await act(async () => {
      await Promise.all([firstSubmit, secondSubmit]);
    });
    expect(pushMock.notifySpaceMutation).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('does not notify source authors when a quote is posted as private', async () => {
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        memories: [
          {
            id: validMemoryId,
            isPrivate: false,
            kind: 'post',
            space: { id: 'shared-1' },
            author: { id: 'user-2' },
          },
        ],
      },
    });
    pushMock.notifySpaceMutation.mockClear();
    memoryNotificationMock.notifyMemoryQuote.mockClear();
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Private quote note',
      attachments: [],
      pollOptions: [],
      mode: 'quote',
      quoteId: validMemoryId,
      isPrivate: true,
      notifyMembers: false,
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await act(async () => {
      await latest.submit();
    });

    const ops = dbMock.transact.mock.calls.at(-1)?.[0] ?? [];
    expect(ops[0]).toMatchObject({
      table: 'memories',
      data: {
        body: 'Private quote note',
        kind: 'quote',
        isPrivate: true,
        notifyMembers: false,
      },
      links: {
        space: 'solo-1',
        author: 'user-1',
        quoteOf: validMemoryId,
      },
    });
    expect(pushMock.notifySpaceMutation).not.toHaveBeenCalled();
    expect(memoryNotificationMock.notifyMemoryQuote).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed before editing a memory outside scoped spaces', async () => {
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockResolvedValueOnce({ data: { memories: [] } });
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Edited outside memory',
      attachments: [],
      pollOptions: [],
      mode: 'edit',
      editId: validMemoryId,
      editKind: 'post',
      isPrivate: false,
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await act(async () => {
      await expect(latest.submit()).rejects.toThrow('Memory not found');
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed before replying to a memory outside the target shared space', async () => {
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        memories: [
          {
            id: validMemoryId,
            isPrivate: false,
            kind: 'post',
            space: { id: 'solo-1' },
            author: { id: 'user-2' },
          },
        ],
      },
    });
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Reply outside target',
      attachments: [],
      pollOptions: [],
      mode: 'reply',
      parentId: validMemoryId,
      isPrivate: false,
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await act(async () => {
      await expect(latest.submit()).rejects.toThrow('Parent memory must belong to the target space.');
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('uses the trusted memory API when posting entity attachments with an API base configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test/');
    dbMock.transact.mockClear();
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ ok: true, memoryId: 'server-memory-entity' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Attach scoped item',
      attachments: [{ type: 'task', refId: validEntityId, spaceId: 'shared-1' }],
      pollOptions: [],
      mode: 'post',
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await act(async () => {
      await latest.submit();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pacto.example.test/api/memories',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      spaceId: 'shared-1',
      body: 'Attach scoped item',
      mode: 'post',
      isPrivate: false,
      notifyMembers: true,
      attachments: [
        expect.objectContaining({
          type: 'task',
          refId: validEntityId,
          spaceId: 'shared-1',
        }),
      ],
    }));
    expect(pushMock.notifySpaceMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryId: 'server-memory-entity',
        route: '/(tabs)/memories/server-memory-entity',
      }),
    );
    act(() => renderer.unmount());
  });

  it('fails closed for attachment posts when the trusted memory API is not configured', async () => {
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockClear();
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Photo',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/photo.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/photo.jpg',
          mediaSize: 50,
        },
      ],
      pollOptions: [],
      mode: 'post',
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await expect(latest.submit()).rejects.toThrow('Memory API is required for attachments.');
    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('fails closed for attachment posts when the trusted memory API cannot authenticate', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test/');
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockClear();
    dbMock.getAuth.mockResolvedValueOnce(null);
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Photo',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/photo.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/photo.jpg',
          mediaSize: 50,
        },
      ],
      pollOptions: [],
      mode: 'post',
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await expect(latest.submit()).rejects.toThrow('Memory API requires a signed-in session.');
    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(dbMock.transact).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('uses the trusted media memory API when posting uploaded media with an API base configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://pacto.example.test/');
    dbMock.transact.mockClear();
    dbMock.queryOnce.mockClear();
    dbMock.getAuth.mockResolvedValueOnce({ refresh_token: 'refresh-token' });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ memoryId: 'server-memory-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    pushMock.notifySpaceMutation.mockClear();
    sessionMock.current = {
      mode: 'pair',
      user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
      activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
      space: { id: 'shared-1', kind: 'pair', plan: 'free' },
      soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
      sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
      personalSpaceId: 'solo-1',
      sharedSpaceId: 'shared-1',
    };
    setMemoryComposerDraft({
      body: 'Photo',
      attachments: [
        {
          type: 'image',
          mediaUrl: 'https://cdn.pacto.test/photo.jpg',
          mediaPath: 'users/user-1/spaces/shared-1/memories/photo.jpg',
          mediaSize: 50,
        },
      ],
      pollOptions: [],
      mode: 'post',
    });

    const { latest, renderer } = await renderHookValue(() => useMemoryComposer());

    await act(async () => {
      await latest.submit();
    });

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pacto.example.test/api/memories',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer refresh-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      spaceId: 'shared-1',
      body: 'Photo',
      mode: 'post',
      isPrivate: false,
      notifyMembers: true,
      attachments: [
        expect.objectContaining({
          type: 'image',
          mediaPath: 'users/user-1/spaces/shared-1/memories/photo.jpg',
          mediaSize: 50,
        }),
      ],
    }));
    expect(pushMock.notifySpaceMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryId: 'server-memory-1',
        route: '/(tabs)/memories/server-memory-1',
      }),
    );
    act(() => renderer.unmount());
  });
});
