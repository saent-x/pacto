import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  data: null as any,
}));

const sessionState = vi.hoisted(() => ({
  activeCouple: { couple: { id: 'couple-1' } },
  personalSpaceId: 'solo-1',
  sharedSpaceId: 'couple-1',
  user: { id: 'user-1', displayName: 'Tor' },
}));

const txCalls = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; rowId: string; payload: Record<string, unknown> }>,
  deletes: [] as Array<{ table: string; rowId: string }>,
}));

const dbMock = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: queryState.data, isLoading: false })),
  queryOnce: vi.fn(async () => ({ data: { $files: [{ url: 'https://cdn.pacto.test/journal.jpg' }] } })),
  storage: {
    uploadFile: vi.fn(async () => undefined),
  },
  transact: vi.fn(async (operation: any) => operation),
  tx: new Proxy({}, {
    get: (_target, table: string) =>
      new Proxy({}, {
        get: (_rows, rowId: string) => ({
          update: vi.fn((updatePayload: Record<string, unknown>) => {
            txCalls.updates.push({ table, rowId, payload: updatePayload });
            return {
            link: vi.fn((payload: any) => ({ table, rowId, payload })),
            };
          }),
          delete: vi.fn(() => {
            txCalls.deletes.push({ table, rowId });
            return { table, rowId, type: 'delete' };
          }),
        }),
      }),
  }),
}));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: vi.fn(() => 'new-entry-id'),
  lookup: vi.fn((field: string, value: string) => `lookup:${field}:${value}`),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/hooks/useEncryption', () => ({
  useEncryption: () => ({
    encrypt: vi.fn(async (value: string) => value),
    decrypt: vi.fn(async (value: string) => value),
    hasKey: false,
  }),
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

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

  return { latest: latest!, renderer, getLatest: () => latest! };
}

describe('useJournal', () => {
  beforeEach(() => {
    sessionState.activeCouple = { couple: { id: 'couple-1' } };
    sessionState.personalSpaceId = 'solo-1';
    sessionState.sharedSpaceId = 'couple-1';
    sessionState.user = { id: 'user-1', displayName: 'Tor' };
    queryState.data = null;
    dbMock.useQuery.mockClear();
    dbMock.queryOnce.mockClear();
    dbMock.storage.uploadFile.mockClear();
    dbMock.transact.mockClear();
    txCalls.updates = [];
    txCalls.deletes = [];
  });

  it('queries personal solo and shared pact entries together', async () => {
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { renderer } = await renderHookValue(() => useJournal());

    expect(dbMock.useQuery).toHaveBeenCalledWith({
      journalEntries: {
        $: {
          where: {
            or: [{ 'couple.id': 'solo-1' }, { 'couple.id': 'couple-1' }],
          },
        },
        couple: {},
        author: {},
      },
    });

    act(() => renderer.unmount());
  });

  it('writes private entries to the permanent solo space', async () => {
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await act(async () => {
      await latest.create({
        body: 'private note',
        is_private: true,
        entry_date: '2026-05-23',
      });
      await flush();
    });

    expect(await dbMock.transact.mock.results[0].value).toEqual({
      table: 'journalEntries',
      rowId: 'new-entry-id',
      payload: { couple: 'solo-1', author: 'user-1' },
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of routing private entries to a shared fallback when the personal space is missing', async () => {
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = 'couple-1';
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.create({
      body: 'private note',
      is_private: true,
      entry_date: '2026-05-23',
    })).rejects.toThrow('No active space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('stores fallback solo journal creates as private', async () => {
    sessionState.activeCouple = { couple: { id: 'solo-1' } };
    sessionState.sharedSpaceId = null as any;
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await act(async () => {
      await latest.create({
        body: 'solo fallback',
        is_private: false,
        entry_date: '2026-05-23',
      });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual(
      expect.objectContaining({
        table: 'journalEntries',
        rowId: 'new-entry-id',
        payload: expect.objectContaining({ isPrivate: true }),
      }),
    );
    expect(await dbMock.transact.mock.results[0].value).toEqual({
      table: 'journalEntries',
      rowId: 'new-entry-id',
      payload: { couple: 'solo-1', author: 'user-1' },
    });

    act(() => renderer.unmount());
  });

  it('persists journal media paths with media URLs so uploaded files can be cleaned up', async () => {
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await act(async () => {
      await latest.create({
        body: 'private note',
        is_private: true,
        entry_date: '2026-05-23',
        mediaUrls: ['https://cdn.pacto.test/journal.jpg'],
        mediaPaths: ['users/user-1/spaces/solo-1/journal/image-1.jpg'],
      });
      await flush();
    });

    expect(txCalls.updates[0]).toEqual(
      expect.objectContaining({
        table: 'journalEntries',
        rowId: 'new-entry-id',
        payload: expect.objectContaining({
          mediaUrls: ['https://cdn.pacto.test/journal.jpg'],
          mediaPaths: ['users/user-1/spaces/solo-1/journal/image-1.jpg'],
        }),
      }),
    );

    act(() => renderer.unmount());
  });

  it('relinks journal entries when privacy changes during edit', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'entry-1',
          couple: { id: 'couple-1' },
          author: { id: 'user-1' },
          title: 'Shared note',
          body: 'Move this note',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          mediaPaths: [],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await act(async () => {
      await latest.update('entry-1', { is_private: true });
      await flush();
    });

    expect(await dbMock.transact.mock.results[0].value).toEqual({
      table: 'journalEntries',
      rowId: 'entry-1',
      payload: { couple: 'solo-1' },
    });

    act(() => renderer.unmount());
  });

  it('fails closed instead of silently succeeding when create has no target space', async () => {
    sessionState.activeCouple = null as any;
    sessionState.personalSpaceId = null as any;
    sessionState.sharedSpaceId = null as any;
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.create({
      body: 'ghost note',
      entry_date: '2026-05-23',
    })).rejects.toThrow('No active space');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating journal entries with malformed privacy metadata', async () => {
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.create({
      body: 'ambiguous note',
      is_private: 'false' as any,
      entry_date: '2026-05-23',
    })).rejects.toThrow('Invalid journal entry privacy');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of creating malformed journal entry dates', async () => {
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.create({
      body: 'Imported impossible date',
      is_private: false,
      entry_date: '2030-02-31',
    })).rejects.toThrow('Invalid journal entry date');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating a journal entry outside the scoped result set', async () => {
    queryState.data = { journalEntries: [] };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.update('missing-entry', { body: 'Wrong journal entry' })).rejects.toThrow('Journal entry not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating another member journal entry', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'partner-entry',
          couple: { id: 'couple-1' },
          author: { id: 'user-2' },
          title: 'Shared partner note',
          body: 'This belongs to someone else',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          mediaPaths: [],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.update('partner-entry', { body: 'Overwrite partner note' }))
      .rejects.toThrow('Journal entry not found');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating journal entries with malformed privacy metadata', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'entry-1',
          couple: { id: 'couple-1' },
          author: { id: 'user-1' },
          title: 'Shared note',
          body: 'Keep privacy metadata explicit',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          mediaPaths: [],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.update('entry-1', {
      is_private: 'false' as any,
    })).rejects.toThrow('Invalid journal entry privacy');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of updating malformed journal entry dates', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'entry-1',
          couple: { id: 'couple-1' },
          author: { id: 'user-1' },
          title: 'Shared note',
          body: 'Keep this dated correctly',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          mediaPaths: [],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.update('entry-1', {
      entry_date: 'not-a-date',
    })).rejects.toThrow('Invalid journal entry date');

    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.updates).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting a journal entry outside the scoped result set', async () => {
    queryState.data = { journalEntries: [] };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.remove('missing-entry')).rejects.toThrow('Journal entry not found');

    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.deletes).toEqual([]);
    act(() => renderer.unmount());
  });

  it('fails closed instead of deleting another member journal entry', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'partner-entry',
          couple: { id: 'couple-1' },
          author: { id: 'user-2' },
          title: 'Shared partner note',
          body: 'This belongs to someone else',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          mediaPaths: ['users/user-2/spaces/couple-1/journal/theirs.jpg'],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.remove('partner-entry')).rejects.toThrow('Journal entry not found');

    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    expect(dbMock.transact).not.toHaveBeenCalled();
    expect(txCalls.deletes).toEqual([]);
    act(() => renderer.unmount());
  });

  it('preserves the author id when Instant returns a has-one relation object', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'entry-1',
          couple: { id: 'couple-1' },
          author: { id: 'user-1' },
          title: 'Jounrallee',
          body: 'This is a simple journallee',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: Date.parse('2026-05-21T13:46:00Z'),
          updatedAt: Date.parse('2026-05-21T13:46:00Z'),
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    expect(latest.allEntries[0].author_id).toBe('user-1');

    act(() => renderer.unmount());
  });

  it('keeps malformed legacy timestamps from crashing journal normalization', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'legacy-malformed-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Imported note',
          body: 'This row should stay visible for cleanup',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: 'bad-created-at',
          updatedAt: 'bad-updated-at',
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    expect(latest.allEntries).toEqual([
      expect.objectContaining({
        id: 'legacy-malformed-entry',
        created_at: '',
        updated_at: '',
        is_private: true,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('keeps impossible ISO-like legacy timestamps from becoming real journal dates', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'legacy-impossible-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Imported note',
          body: 'This row should stay visible for cleanup',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: '2026-04-31T13:46:00.000Z',
          updatedAt: '2026-02-29T13:46:00.000Z',
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    expect(latest.allEntries).toEqual([
      expect.objectContaining({
        id: 'legacy-impossible-entry',
        created_at: '',
        updated_at: '',
        is_private: true,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('keeps oversized numeric legacy timestamps from crashing journal normalization', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'legacy-oversized-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Imported note',
          body: 'This row should stay visible for cleanup',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: Number.MAX_VALUE,
          updatedAt: Number.MAX_VALUE,
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    expect(latest.allEntries).toEqual([
      expect.objectContaining({
        id: 'legacy-oversized-entry',
        created_at: '',
        updated_at: '',
        is_private: true,
      }),
    ]);

    act(() => renderer.unmount());
  });

  it('classifies personal-space journal rows as private even when legacy solo rows are flagged shared', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'solo-legacy-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Solo legacy',
          body: 'Created before joining a pair',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: Date.parse('2026-05-21T13:46:00Z'),
          updatedAt: Date.parse('2026-05-21T13:46:00Z'),
        },
        {
          id: 'shared-entry',
          couple: { id: 'couple-1' },
          author: { id: 'user-1' },
          title: 'Shared',
          body: 'Visible to the shared pact',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-22',
          createdAt: Date.parse('2026-05-22T13:46:00Z'),
          updatedAt: Date.parse('2026-05-22T13:46:00Z'),
        },
        {
          id: 'private-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Private',
          body: 'Explicit private row',
          mood: null,
          isPrivate: true,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, getLatest, renderer } = await renderHookValue(() => useJournal());

    expect(getLatest().allEntries.find((entry) => entry.id === 'solo-legacy-entry')?.is_private)
      .toBe(true);

    await act(async () => {
      latest.setFilter('shared');
      await flush();
    });

    expect(getLatest().entries.map((entry) => entry.id)).toEqual(['shared-entry']);

    await act(async () => {
      getLatest().setFilter('private');
      await flush();
    });

    expect(getLatest().entries.map((entry) => entry.id)).toEqual([
      'solo-legacy-entry',
      'private-entry',
    ]);

    act(() => renderer.unmount());
  });

  it('normalizes malformed legacy journal privacy flags from the owning space', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'shared-malformed-entry',
          couple: { id: 'couple-1' },
          author: { id: 'user-1' },
          title: 'Shared malformed',
          body: 'This should remain shared',
          mood: null,
          isPrivate: 'false',
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: Date.parse('2026-05-21T13:46:00Z'),
          updatedAt: Date.parse('2026-05-21T13:46:00Z'),
        },
        {
          id: 'personal-malformed-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Personal malformed',
          body: 'This should remain private',
          mood: null,
          isPrivate: 'false',
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-22',
          createdAt: Date.parse('2026-05-22T13:46:00Z'),
          updatedAt: Date.parse('2026-05-22T13:46:00Z'),
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, getLatest, renderer } = await renderHookValue(() => useJournal());

    expect(latest.allEntries.find((entry) => entry.id === 'shared-malformed-entry')?.is_private)
      .toBe(false);
    expect(latest.allEntries.find((entry) => entry.id === 'personal-malformed-entry')?.is_private)
      .toBe(true);

    await act(async () => {
      latest.setFilter('shared');
      await flush();
    });

    expect(getLatest().entries.map((entry) => entry.id)).toEqual(['shared-malformed-entry']);

    await act(async () => {
      getLatest().setFilter('private');
      await flush();
    });

    expect(getLatest().entries.map((entry) => entry.id)).toEqual(['personal-malformed-entry']);

    act(() => renderer.unmount());
  });

  it('does not expose partner-authored rows from the current user personal space', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'personal-partner-entry',
          couple: { id: 'solo-1' },
          author: { id: 'partner-1' },
          title: 'Wrong personal note',
          body: 'Should not appear',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-21',
          createdAt: Date.parse('2026-05-21T13:46:00Z'),
          updatedAt: Date.parse('2026-05-21T13:46:00Z'),
        },
        {
          id: 'personal-self-entry',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'My personal note',
          body: 'Private',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-22',
          createdAt: Date.parse('2026-05-22T13:46:00Z'),
          updatedAt: Date.parse('2026-05-22T13:46:00Z'),
        },
        {
          id: 'shared-partner-entry',
          couple: { id: 'couple-1' },
          author: { id: 'partner-1' },
          title: 'Shared partner note',
          body: 'Shared',
          mood: null,
          isPrivate: false,
          mediaUrls: [],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };

    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());
    const ids = latest.allEntries.map((entry) => entry.id);

    expect(ids).not.toContain('personal-partner-entry');
    expect(ids).toContain('personal-self-entry');
    expect(ids).toContain('shared-partner-entry');
    expect(latest.allEntries.find((entry) => entry.id === 'personal-self-entry')?.is_private).toBe(true);

    act(() => renderer.unmount());
  });

  it('fails closed instead of uploading journal images with malformed privacy metadata', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValueOnce({
      blob: vi.fn(async () => new Blob(['image-bytes'], { type: 'image/png' })),
    } as any);
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await expect(latest.uploadJournalImage({
      uri: 'file:///tmp/journal.png',
      contentType: 'image/png',
      is_private: 'false' as any,
    })).rejects.toThrow('Invalid journal entry privacy');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dbMock.storage.uploadFile).not.toHaveBeenCalled();
    expect(dbMock.queryOnce).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    act(() => renderer.unmount());
  });

  it('uploads journal images under the owner-controlled space path and returns the file URL and path', async () => {
    const { useJournal, buildJournalImagePath } = await import('@/src/hooks/useJournal');

    expect(
      buildJournalImagePath({
        userId: 'user-1',
        spaceId: 'solo-1',
        contentType: 'image/png',
        id: 'image-1',
      }),
    ).toBe('users/user-1/spaces/solo-1/journal/image-1.png');

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValueOnce({
      blob: vi.fn(async () => new Blob(['image-bytes'], { type: 'image/png' })),
    } as any);
    const { latest, renderer } = await renderHookValue(() => useJournal());

    const uploaded = await latest.uploadJournalImage({
      uri: 'file:///tmp/journal.png',
      contentType: 'image/png',
      is_private: true,
    });

    expect(fetchSpy).toHaveBeenCalledWith('file:///tmp/journal.png');
    const uploadPath = dbMock.storage.uploadFile.mock.calls[0][0];
    expect(uploadPath).toMatch(/^users\/user-1\/spaces\/solo-1\/journal\/.+\.png$/);
    expect(dbMock.storage.uploadFile.mock.calls[0][2]).toEqual({ contentType: 'image/png' });
    expect(dbMock.queryOnce).toHaveBeenCalledWith({
      $files: { $: { where: { path: uploadPath } } },
    });
    expect(uploaded).toEqual({
      mediaUrl: 'https://cdn.pacto.test/journal.jpg',
      mediaPath: uploadPath,
    });

    fetchSpy.mockRestore();
    act(() => renderer.unmount());
  });

  it('deletes owner-scoped journal media files when removing an entry', async () => {
    queryState.data = {
      journalEntries: [
        {
          id: 'entry-1',
          couple: { id: 'solo-1' },
          author: { id: 'user-1' },
          title: 'Private note',
          body: 'Clean up this note',
          mood: null,
          isPrivate: true,
          mediaUrls: [],
          mediaPaths: ['users/user-1/spaces/solo-1/journal/owned.jpg'],
          tags: [],
          entryDate: '2026-05-23',
          createdAt: Date.parse('2026-05-23T13:46:00Z'),
          updatedAt: Date.parse('2026-05-23T13:46:00Z'),
        },
      ],
    };
    dbMock.queryOnce.mockResolvedValueOnce({
      data: {
        journalEntries: [
          {
            mediaPaths: [
              'users/user-1/spaces/solo-1/journal/owned.jpg',
              'users/user-2/spaces/solo-1/journal/theirs.jpg',
              'spaces/solo-1/journal/legacy.jpg',
              'users/user-1/spaces/solo-1/journal/owned.jpg',
            ],
          },
        ],
      },
    });
    const { useJournal } = await import('@/src/hooks/useJournal');
    const { latest, renderer } = await renderHookValue(() => useJournal());

    await act(async () => {
      await latest.remove('entry-1');
      await flush();
    });

    expect(dbMock.queryOnce).toHaveBeenCalledWith({
      journalEntries: {
        $: { where: { id: 'entry-1' } },
      },
    });
    expect(dbMock.transact).toHaveBeenCalledWith([
      {
        table: '$files',
        rowId: 'lookup:path:users/user-1/spaces/solo-1/journal/owned.jpg',
        type: 'delete',
      },
      { table: 'journalEntries', rowId: 'entry-1', type: 'delete' },
    ]);
    expect(txCalls.deletes).toEqual([
      { table: '$files', rowId: 'lookup:path:users/user-1/spaces/solo-1/journal/owned.jpg' },
      { table: 'journalEntries', rowId: 'entry-1' },
    ]);

    act(() => renderer.unmount());
  });
});
