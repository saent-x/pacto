import { useCallback, useMemo } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

import { useSession } from './useSession';

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
  const rows = useQuery(listLoveNotesQuery, activeCouple ? {} : 'skip');
  const createLoveNote = useMutation(createLoveNoteMutation);
  const updateLoveNoteFn = useMutation(updateLoveNoteMutation);
  const deleteLoveNote = useMutation(deleteLoveNoteMutation);

  const notes = useMemo(() => rows ?? [], [rows]);

  const create = useCallback(
    async (data: LoveNoteInput) => {
      await createLoveNote({
        body: data.body,
        isPrivate: data.isPrivate,
      });
    },
    [createLoveNote],
  );

  const update = useCallback(
    async (id: string, data: Partial<LoveNoteInput>) => {
      await updateLoveNoteFn({
        noteId: id,
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.isPrivate !== undefined ? { isPrivate: data.isPrivate } : {}),
      });
    },
    [updateLoveNoteFn],
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
