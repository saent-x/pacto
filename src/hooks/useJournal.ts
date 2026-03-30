import { useCallback, useMemo, useState } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';
import type { JournalEntry } from '@/src/types/database';

type EntryInput = {
  title?: string | null;
  body: string;
  mood?: string | null;
  is_private?: boolean;
  entry_date: string;
  media_storage_ids?: string[];
};

type JournalImageUploadInput = {
  uri: string;
  contentType?: string;
};

type JournalEntryDoc = {
  _id: string;
  coupleId: string;
  authorId: string;
  title: string | null;
  body: string;
  mood: string | null;
  isPrivate: boolean;
  mediaUrls: string[];
  tags: string[];
  entryDate: string;
  createdAt: number;
  updatedAt: number;
};

export type JournalFilter = 'all' | 'shared' | 'private';

const getJournalEntriesQuery = makeFunctionReference<'query', {}, JournalEntryDoc[]>('journalEntries:getJournalEntries');
const generateJournalImageUploadUrlMutation = makeFunctionReference<'mutation', {}, string>(
  'journalEntries:generateJournalImageUploadUrl',
);
const createJournalEntryMutation = makeFunctionReference<
  'mutation',
  {
    title?: string | null;
    body: string;
    mood?: string | null;
    isPrivate?: boolean;
    entryDate: string;
    mediaStorageIds?: string[];
  },
  JournalEntryDoc
>('journalEntries:createJournalEntry');
const updateJournalEntryMutation = makeFunctionReference<
  'mutation',
  {
    entryId: string;
    title?: string | null;
    body?: string;
    mood?: string | null;
    isPrivate?: boolean;
    entryDate?: string;
    mediaStorageIds?: string[];
  },
  JournalEntryDoc
>('journalEntries:updateJournalEntry');
const deleteJournalEntryMutation = makeFunctionReference<'mutation', { entryId: string }, null>('journalEntries:deleteJournalEntry');

function toJournalEntryRow(entry: JournalEntryDoc): JournalEntry {
  return {
    id: entry._id,
    couple_id: entry.coupleId,
    author_id: entry.authorId,
    title: entry.title,
    body: entry.body,
    mood: entry.mood,
    is_private: entry.isPrivate,
    media_urls: [...entry.mediaUrls],
    tags: [...entry.tags],
    entry_date: entry.entryDate,
    created_at: new Date(entry.createdAt).toISOString(),
    updated_at: new Date(entry.updatedAt).toISOString(),
  };
}

export function useJournal() {
  const { activeCouple, profile } = useSession();
  const convex = useConvex();
  const userId = profile?._id ?? null;
  const rows = useQuery(getJournalEntriesQuery, activeCouple ? {} : 'skip');
  const generateImageUploadUrl = useMutation(generateJournalImageUploadUrlMutation);
  const createJournalEntry = useMutation(createJournalEntryMutation);
  const updateJournalEntry = useMutation(updateJournalEntryMutation);
  const deleteJournalEntry = useMutation(deleteJournalEntryMutation);
  const [filter, setFilter] = useState<JournalFilter>('all');

  const allEntries = useMemo(() => (rows ?? []).map(toJournalEntryRow), [rows]);

  const create = useCallback(
    async (data: EntryInput) => {
      await createJournalEntry({
        title: data.title ?? null,
        body: data.body,
        mood: data.mood ?? null,
        isPrivate: data.is_private ?? false,
        entryDate: data.entry_date,
        ...(data.media_storage_ids ? { mediaStorageIds: data.media_storage_ids } : {}),
      });
    },
    [createJournalEntry],
  );

  const update = useCallback(
    async (id: string, data: Partial<EntryInput>) => {
      await updateJournalEntry({
        entryId: id,
        ...(data.title !== undefined ? { title: data.title ?? null } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.mood !== undefined ? { mood: data.mood ?? null } : {}),
        ...(data.is_private !== undefined ? { isPrivate: data.is_private } : {}),
        ...(data.entry_date !== undefined ? { entryDate: data.entry_date } : {}),
        ...(data.media_storage_ids !== undefined ? { mediaStorageIds: data.media_storage_ids } : {}),
      });
    },
    [updateJournalEntry],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteJournalEntry({ entryId: id });
    },
    [deleteJournalEntry],
  );

  const entries = allEntries.filter((entry) => {
    if (filter === 'shared') return !entry.is_private;
    if (filter === 'private') return entry.author_id === userId && entry.is_private;
    return true;
  });

  const getImageUploadUrl = useCallback(async () => {
    return await generateImageUploadUrl({});
  }, [generateImageUploadUrl]);

  const uploadJournalImage = useCallback(
    async ({ uri, contentType }: JournalImageUploadInput) => {
      const uploadUrl = await getImageUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: contentType ? { 'Content-Type': contentType } : undefined,
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload journal image.');
      }

      const result = (await uploadResponse.json()) as { storageId: string };
      return result.storageId;
    },
    [getImageUploadUrl],
  );

  return {
    entries,
    allEntries,
    isLoading: !!activeCouple && rows === undefined,
    filter,
    setFilter,
    create,
    update,
    remove,
    getImageUploadUrl,
    uploadJournalImage,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(getJournalEntriesQuery, {});
    },
  };
}
