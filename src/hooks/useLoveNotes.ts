import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';
import { useEncryption } from './useEncryption';

type LoveNoteDoc = {
  _id: string;
  coupleId: string;
  authorId: string;
  body: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
};

type LoveNoteInput = {
  body: string;
  isPrivate?: boolean;
};

const listLoveNotesQuery = makeFunctionReference<'query', {}, LoveNoteDoc[]>(
  'loveNotes:listLoveNotes',
);
const createLoveNoteMutation = makeFunctionReference<
  'mutation',
  { body: string; isPrivate?: boolean },
  LoveNoteDoc
>('loveNotes:createLoveNote');
const updateLoveNoteMutation = makeFunctionReference<
  'mutation',
  { noteId: string; body?: string; isPrivate?: boolean },
  LoveNoteDoc
>('loveNotes:updateLoveNote');
const deleteLoveNoteMutation = makeFunctionReference<
  'mutation',
  { noteId: string },
  null
>('loveNotes:deleteLoveNote');

export function useLoveNotes() {
  const { activeCouple } = useSession();
  const convex = useConvex();
  const { encrypt, decrypt, hasKey } = useEncryption();
  const rows = useQuery(listLoveNotesQuery, activeCouple ? {} : 'skip');
  const createLoveNote = useMutation(createLoveNoteMutation);
  const updateLoveNoteFn = useMutation(updateLoveNoteMutation);
  const deleteLoveNote = useMutation(deleteLoveNoteMutation);

  const rawNotes = useMemo(() => rows ?? [], [rows]);
  const [notes, setNotes] = useState<LoveNoteDoc[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function decryptNotes() {
      const decrypted = await Promise.all(
        rawNotes.map(async (note) => ({
          ...note,
          body: await decrypt(note.body),
        })),
      );
      if (!cancelled) setNotes(decrypted);
    }
    if (hasKey) {
      decryptNotes();
    } else {
      setNotes(rawNotes);
    }
    return () => { cancelled = true; };
  }, [rawNotes, decrypt, hasKey]);

  const create = useCallback(
    async (data: LoveNoteInput) => {
      await createLoveNote({
        body: await encrypt(data.body),
        isPrivate: data.isPrivate,
      });
    },
    [createLoveNote, encrypt],
  );

  const update = useCallback(
    async (id: string, data: Partial<LoveNoteInput>) => {
      await updateLoveNoteFn({
        noteId: id,
        ...(data.body !== undefined ? { body: await encrypt(data.body!) } : {}),
        ...(data.isPrivate !== undefined ? { isPrivate: data.isPrivate } : {}),
      });
    },
    [updateLoveNoteFn, encrypt],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteLoveNote({ noteId: id });
    },
    [deleteLoveNote],
  );

  return {
    notes,
    isLoading: !!activeCouple && rows === undefined,
    create,
    update,
    remove,
    refetch: async () => {
      if (!activeCouple) return;
      await convex.query(listLoveNotesQuery, {});
    },
  };
}
