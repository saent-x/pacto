import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, id } from '@/src/lib/instant';
import { useSession } from './useSession';
import { useEncryption } from './useEncryption';

type LoveNoteInput = {
  body: string;
  isPrivate?: boolean;
};

export function useLoveNotes() {
  const { activeCouple, user } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const { encrypt, decrypt, hasKey } = useEncryption();

  const { data, isLoading: queryLoading } = db.useQuery(
    coupleId
      ? { loveNotes: { $: { where: { 'couple.id': coupleId } }, author: {} } }
      : null,
  );

  const rawNotes = useMemo(
    () => (data?.loveNotes ?? []).map((n) => ({
      ...n,
      authorId: (n.author as any)?.[0]?.id ?? (n.author as any)?.id ?? '',
    })),
    [data?.loveNotes],
  );
  const [notes, setNotes] = useState<typeof rawNotes>([]);

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
    return () => {
      cancelled = true;
    };
  }, [rawNotes, decrypt, hasKey]);

  const create = useCallback(
    async (input: LoveNoteInput) => {
      if (!coupleId || !user) return;
      const noteId = id();
      const now = Date.now();
      await db.transact(
        db.tx.loveNotes[noteId]
          .update({
            body: await encrypt(input.body),
            isPrivate: input.isPrivate ?? false,
            createdAt: now,
            updatedAt: now,
          })
          .link({ couple: coupleId, author: user.id }),
      );
    },
    [coupleId, user, encrypt],
  );

  const update = useCallback(
    async (noteId: string, input: Partial<LoveNoteInput>) => {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.body !== undefined) updates.body = await encrypt(input.body);
      if (input.isPrivate !== undefined) updates.isPrivate = input.isPrivate;
      await db.transact(db.tx.loveNotes[noteId].update(updates));
    },
    [encrypt],
  );

  const remove = useCallback(async (noteId: string) => {
    await db.transact(db.tx.loveNotes[noteId].delete());
  }, []);

  return {
    notes,
    isLoading: !!coupleId && queryLoading,
    create,
    update,
    remove,
    refetch: async () => {},
  };
}
