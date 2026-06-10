import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useSpace } from '@/features/account/SpaceProvider';
import { SheetShell, QField, QChips } from '@/features/sheets/parts';
import { confirmDelete } from '@/lib/confirm';

const shareLabel = (share?: string) => {
  const s = (share ?? '').toLowerCase();
  if (s === 'shared') return 'Shared';
  if (s === 'partner' || s === 'pair') return 'Partner';
  return 'Solo';
};

export default function NewTimetable() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { spaceId } = useSpace();
  const create = useMutation(api.timetables.createTimetable);
  const update = useMutation(api.timetables.updateTimetable);
  const remove = useMutation(api.timetables.removeTimetable);

  const timetables = useQuery(api.timetables.listTimetables, editing && spaceId ? { spaceId } : 'skip');
  const existing = editing ? timetables?.find((t) => t._id === id) : undefined;

  const [titleDraft, setTitle] = useState<string | null>(null);
  const [shareDraft, setShare] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = titleDraft ?? existing?.title ?? '';
  const share = shareDraft ?? shareLabel(existing?.share);

  const submit = async () => {
    if (!title.trim() || !spaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (editing && id) {
        await update({ timetableId: id as Id<'timetables'>, title: title.trim(), share });
      } else {
        await create({ spaceId, title: title.trim(), share, items: [] });
      }
      router.back();
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setBusy(false);
    }
  };

  const onDelete = () =>
    confirmDelete({
      title: 'Delete timetable?',
      onConfirm: async () => {
        if (id) await remove({ timetableId: id as Id<'timetables'> });
        router.back();
      },
    });

  return (
    <SheetShell
      kicker={editing ? 'Edit' : 'New'}
      title="Timetable"
      footerLabel={busy ? 'Saving…' : editing ? 'Save changes' : 'Create timetable'}
      onSubmit={submit}
      disabled={!title.trim() || busy}
      onDelete={editing ? onDelete : undefined}
      loading={editing && timetables === undefined}
      busy={busy}
      error={error}
    >
      <QField label="Name it" value={title} onChangeText={setTitle} placeholder="Weekday rhythm" big />
      <QChips label="Share" options={['Solo', 'Shared', 'Partner']} value={share} onPick={setShare} />
    </SheetShell>
  );
}
