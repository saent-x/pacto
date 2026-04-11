import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import { useEncryption } from './useEncryption';
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
};

export type JournalFilter = 'all' | 'shared' | 'private';

function toJournalEntryRow(entry: any): JournalEntry {
  return {
    id: entry.id,
    couple_id: entry.couple?.[0]?.id ?? '',
    author_id: entry.author?.[0]?.id ?? '',
    title: entry.title ?? null,
    body: entry.body,
    mood: entry.mood ?? null,
    is_private: entry.isPrivate,
    media_urls: Array.isArray(entry.mediaUrls) ? entry.mediaUrls : [],
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    entry_date: entry.entryDate,
    created_at: new Date(entry.createdAt).toISOString(),
    updated_at: new Date(entry.updatedAt).toISOString(),
  };
}

export function useJournal() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const userId = user?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();
  const [filter, setFilter] = useState<JournalFilter>('all');

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? {
          journalEntries: {
            $: { where: { 'couple.id': coupleId } },
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
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function decryptEntries() {
      const decrypted = await Promise.all(
        rawEntries.map(async (entry) => ({
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
      setAllEntries(rawEntries);
    }
    return () => {
      cancelled = true;
    };
  }, [rawEntries, decrypt, hasKey]);

  const create = useCallback(
    async (input: EntryInput & { mediaUrls?: string[]; media_urls?: string[] }) => {
      if (!coupleId || !userId) return;
      const entryId = id();
      const now = Date.now();
      const txn = db.tx.journalEntries[entryId]
        .update({
          title: input.title ? await encrypt(input.title) : undefined,
          body: await encrypt(input.body),
          mood: input.mood ?? undefined,
          isPrivate: input.is_private ?? false,
          tags: [],
          mediaUrls: input.mediaUrls ?? input.media_urls ?? [],
          entryDate: input.entry_date,
          createdAt: now,
          updatedAt: now,
        })
        .link({ couple: coupleId, author: userId });
      await db.transact(txn);
    },
    [coupleId, userId, encrypt],
  );

  const update = useCallback(
    async (entryId: string, input: Partial<EntryInput> & { mediaUrls?: string[]; media_urls?: string[] }) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title !== undefined) updates.title = input.title ? await encrypt(input.title) : undefined;
      if (input.body !== undefined) updates.body = await encrypt(input.body!);
      if (input.mood !== undefined) updates.mood = input.mood ?? undefined;
      if (input.is_private !== undefined) updates.isPrivate = input.is_private;
      if (input.entry_date !== undefined) updates.entryDate = input.entry_date;
      const urls = input.mediaUrls ?? input.media_urls;
      if (urls !== undefined) updates.mediaUrls = urls;
      await db.transact(db.tx.journalEntries[entryId].update(updates));
    },
    [encrypt],
  );

  const remove = useCallback(async (entryId: string) => {
    await db.transact(db.tx.journalEntries[entryId].delete());
  }, []);

  const entries = allEntries.filter((entry) => {
    if (filter === 'shared') return !entry.is_private;
    if (filter === 'private') return entry.author_id === userId && entry.is_private;
    return true;
  });

  const uploadJournalImage = useCallback(
    async ({ uri, contentType }: JournalImageUploadInput) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `journal/${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const file = new File([blob], filename, { type: contentType ?? 'image/jpeg' });
      const { data: fileData } = await db.storage.uploadFile(filename, file);
      return fileData.id;
    },
    [],
  );

  return {
    entries,
    allEntries,
    isLoading: !!coupleId && queryLoading,
    filter,
    setFilter,
    create,
    update,
    remove,
    uploadJournalImage,
    refetch: async () => {},
  };
}
