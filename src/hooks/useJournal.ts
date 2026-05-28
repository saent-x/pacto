import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, id, lookup } from '@/src/lib/instant';
import { useSession } from './useSession';
import { useEncryption } from './useEncryption';
import { personalOrSharedSpaceId, relationWhere, uniqueSpaceIds } from '@/src/lib/space-scope';
import type { JournalEntry } from '@/src/types/database';

type EntryInput = {
  title?: string | null;
  body: string;
  mood?: string | null;
  is_private?: boolean;
  entry_date: string;
};

type JournalImageUploadInput = {
  uri: string;
  contentType?: string;
  is_private?: boolean;
};

type JournalImageUploadResult = {
  mediaUrl: string;
  mediaPath: string;
};

export type JournalFilter = 'all' | 'shared' | 'private';

type UseJournalOptions = {
  enabled?: boolean;
};

function isPersonalTarget(
  targetSpaceId: string | null | undefined,
  personalSpaceId: string | null | undefined,
) {
  return Boolean(targetSpaceId && personalSpaceId && targetSpaceId === personalSpaceId);
}

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    if (!hasValidDatePrefix(value)) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}

function hasValidDatePrefix(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toIsoString(value: unknown): string {
  const timestamp = timestampMs(value);
  return timestamp == null ? '' : new Date(timestamp).toISOString();
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateEntryDate(value: string): string {
  if (!isValidDateKey(value)) throw new Error('Invalid journal entry date');
  return value;
}

function privacyFromOwningSpace(value: unknown, isPersonalSpaceRow: boolean): boolean {
  return value === true || isPersonalSpaceRow;
}

function assertValidJournalEntryPrivacy(value: unknown): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') throw new Error('Invalid journal entry privacy');
}

function toJournalEntryRow(entry: any): JournalEntry {
  const couple = entry.couple?.[0] ?? entry.couple;
  const author = entry.author?.[0] ?? entry.author;
  return {
    id: entry.id,
    couple_id: couple?.id ?? '',
    author_id: author?.id ?? '',
    title: entry.title ?? null,
    body: entry.body,
    mood: entry.mood ?? null,
    is_private: entry.isPrivate,
    media_urls: Array.isArray(entry.mediaUrls) ? entry.mediaUrls : [],
    media_paths: Array.isArray(entry.mediaPaths) ? entry.mediaPaths : [],
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    entry_date: entry.entryDate,
    created_at: toIsoString(entry.createdAt),
    updated_at: toIsoString(entry.updatedAt),
  };
}

export function useJournal(options: UseJournalOptions = {}) {
  const enabled = options.enabled ?? true;
  const session = useSession();
  const { activeCouple, user } = session;
  const coupleId = activeCouple?.couple?.id ?? null;
  const fallbackIsSolo = session.isSolo || session.space?.kind === 'solo' || activeCouple?.couple?.kind === 'solo';
  const personalSpaceId = session.personalSpaceId ?? (fallbackIsSolo ? coupleId : null);
  const sharedSpaceId = session.sharedSpaceId ?? (fallbackIsSolo ? null : coupleId);
  const readableSpaceIds = uniqueSpaceIds([personalSpaceId, sharedSpaceId]);
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const [filter, setFilter] = useState<JournalFilter>('all');

  const { data, isLoading: queryLoading } = db.useQuery(
    enabled && readableSpaceIds.length > 0
      ? {
          journalEntries: {
            $: { where: relationWhere('couple', readableSpaceIds) },
            couple: {},
            author: {},
          },
        }
      : null,
  );

  const rawEntries = useMemo(
    () => (data?.journalEntries ?? []).map(toJournalEntryRow),
    [data?.journalEntries],
  );
  const scopedEntries = useMemo(
    () =>
      rawEntries.flatMap((entry) => {
        const isPersonalSpaceRow = Boolean(personalSpaceId && entry.couple_id === personalSpaceId);
        if (isPersonalSpaceRow && entry.author_id !== userId) return [];
        return [{
          ...entry,
          is_private: privacyFromOwningSpace(entry.is_private, isPersonalSpaceRow),
        }];
      }),
    [personalSpaceId, rawEntries, userId],
  );
  const entryById = useMemo(
    () => new Map(scopedEntries.map((entry) => [entry.id, entry])),
    [scopedEntries],
  );
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function decryptEntries() {
      const decrypted = await Promise.all(
        scopedEntries.map(async (entry) => ({
          ...entry,
          title: entry.title ? await decrypt(entry.title) : entry.title,
          body: await decrypt(entry.body),
        })),
      );
      if (!cancelled) setAllEntries(decrypted);
    }
    if (hasKey) {
      decryptEntries();
    } else {
      setAllEntries(scopedEntries);
    }
    return () => {
      cancelled = true;
    };
  }, [scopedEntries, decrypt, hasKey]);

  const create = useCallback(
    async (input: EntryInput & {
      mediaUrls?: string[];
      media_urls?: string[];
      mediaPaths?: string[];
      media_paths?: string[];
    }) => {
      assertValidJournalEntryPrivacy(input.is_private);
      const targetSpaceId = personalOrSharedSpaceId({
        isPrivate: input.is_private,
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId) throw new Error('No active space');
      if (!userId) throw new Error('No current user');
      const isPrivate = Boolean(input.is_private || isPersonalTarget(targetSpaceId, personalSpaceId));
      const entryDate = validateEntryDate(input.entry_date);
      const entryId = id();
      const now = Date.now();
      const txn = db.tx.journalEntries[entryId]
        .update({
          title: input.title ? await encrypt(input.title) : undefined,
          body: await encrypt(input.body),
          mood: input.mood ?? undefined,
          isPrivate,
          tags: [],
          mediaUrls: input.mediaUrls ?? input.media_urls ?? [],
          mediaPaths: input.mediaPaths ?? input.media_paths ?? [],
          entryDate,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: targetSpaceId, author: userId });
      await db.transact(txn);
    },
    [coupleId, personalSpaceId, sharedSpaceId, userId, encrypt],
  );

  const update = useCallback(
    async (entryId: string, input: Partial<EntryInput> & {
      mediaUrls?: string[];
      media_urls?: string[];
      mediaPaths?: string[];
      media_paths?: string[];
    }) => {
      const current = entryById.get(entryId);
      if (!current || current.author_id !== userId) throw new Error('Journal entry not found');
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title ? await encrypt(input.title) : null;
      if (input.body !== undefined) updates.body = await encrypt(input.body!);
      if (input.mood !== undefined) updates.mood = input.mood ?? null;
      if (input.entry_date !== undefined) updates.entryDate = validateEntryDate(input.entry_date);
      const urls = input.mediaUrls ?? input.media_urls;
      if (urls !== undefined) updates.mediaUrls = urls;
      const paths = input.mediaPaths ?? input.media_paths;
      if (paths !== undefined) updates.mediaPaths = paths;
      let targetSpaceId: string | null = null;
      if (input.is_private !== undefined) {
        assertValidJournalEntryPrivacy(input.is_private);
        targetSpaceId = personalOrSharedSpaceId({
          isPrivate: input.is_private,
          personalSpaceId,
          sharedSpaceId,
          fallbackSpaceId: coupleId,
        });
        if (!targetSpaceId) throw new Error('No active space');
        updates.isPrivate = Boolean(input.is_private || isPersonalTarget(targetSpaceId, personalSpaceId));
      }
      let operation: any = db.tx.journalEntries[entryId].update(updates);
      if (targetSpaceId) {
        operation = operation.link({ couple: targetSpaceId });
      }
      await db.transact(operation);
    },
    [coupleId, entryById, personalSpaceId, sharedSpaceId, userId, encrypt],
  );

  const remove = useCallback(async (entryId: string) => {
    const current = entryById.get(entryId);
    if (!current || current.author_id !== userId) throw new Error('Journal entry not found');
    const mediaPaths = userId
      ? await queryOwnedJournalMediaPaths(entryId, userId)
      : [];
    const fileDeletes = mediaPaths.map((path) =>
      db.tx.$files[lookup('path', path)].delete(),
    );
    await db.transact([
      ...fileDeletes,
      db.tx.journalEntries[entryId].delete(),
    ]);
  }, [entryById, userId]);

  const entries = allEntries.filter((entry) => {
    if (filter === 'shared') return entry.couple_id === sharedSpaceId && !entry.is_private;
    if (filter === 'private') {
      return entry.author_id === userId && (entry.is_private || entry.couple_id === personalSpaceId);
    }
    return true;
  });

  const uploadJournalImage = useCallback(
    async ({ uri, contentType = 'image/jpeg', is_private }: JournalImageUploadInput): Promise<JournalImageUploadResult> => {
      assertValidJournalEntryPrivacy(is_private);
      const targetSpaceId = personalOrSharedSpaceId({
        isPrivate: is_private,
        personalSpaceId,
        sharedSpaceId,
        fallbackSpaceId: coupleId,
      });
      if (!targetSpaceId || !userId) {
        throw new Error('Not signed in or no active space');
      }
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = buildJournalImagePath({
        userId,
        spaceId: targetSpaceId,
        contentType,
      });
      const uploadBlob = new Blob([blob], { type: contentType });
      await db.storage.uploadFile(path, uploadBlob, { contentType });
      const result = await (db as any).queryOnce({
        $files: { $: { where: { path } } },
      });
      const url = result?.data?.$files?.[0]?.url as string | undefined;
      if (!url) throw new Error('upload succeeded but no URL returned');
      return {
        mediaUrl: url,
        mediaPath: path,
      };
    },
    [coupleId, personalSpaceId, sharedSpaceId, userId],
  );

  return {
    entries,
    allEntries,
    isLoading: enabled && readableSpaceIds.length > 0 && queryLoading,
    filter,
    setFilter,
    create,
    update,
    remove,
    uploadJournalImage,
    refetch: async () => {},
  };
}

async function queryOwnedJournalMediaPaths(entryId: string, userId: string): Promise<string[]> {
  const result = await (db as any).queryOnce({
    journalEntries: {
      $: { where: { id: entryId } },
    },
  });
  const entry = result?.data?.journalEntries?.[0];
  return collectOwnedJournalMediaPaths(entry?.mediaPaths, userId);
}

function collectOwnedJournalMediaPaths(mediaPaths: unknown, userId: string): string[] {
  if (!Array.isArray(mediaPaths)) return [];
  const ownerPrefix = `users/${userId}/spaces/`;
  const seen = new Set<string>();
  for (const path of mediaPaths) {
    if (typeof path !== 'string') continue;
    if (!path.startsWith(ownerPrefix)) continue;
    seen.add(path);
  }
  return [...seen];
}

export function buildJournalImagePath(params: {
  userId: string;
  spaceId: string;
  contentType?: string;
  id?: string;
}) {
  const ext = extensionForContentType(params.contentType ?? 'image/jpeg');
  return `users/${params.userId}/spaces/${params.spaceId}/journal/${params.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${ext}`;
}

function extensionForContentType(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/gif') return 'gif';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}
