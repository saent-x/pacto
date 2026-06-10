import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { T } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { SheetShell, QField, QPicker, QAssign } from '@/features/sheets/parts';
import { confirmDelete } from '@/lib/confirm';

// Default new events to noon on the chosen day if no time is implied.
const initialDate = (baseMs: number) => {
  const d = new Date(baseMs);
  if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(12, 0, 0, 0);
  return d;
};

export default function NewEvent() {
  const C = useColors();
  const router = useRouter();
  const { id, day } = useLocalSearchParams<{ id?: string; day?: string }>();
  const editing = !!id;
  const { spaceId, isShared, members } = useSpace();
  const create = useMutation(api.calendar.createEvent);
  const update = useMutation(api.calendar.updateEvent);
  const remove = useMutation(api.calendar.removeEvent);

  // By id, not list+find: the all-time listEvents range would subscribe to the
  // space's entire event history just to resolve one record.
  const event = useQuery(api.calendar.getEvent, editing ? { eventId: id as Id<'calendarEvents'> } : 'skip');
  const existing = event ?? undefined;

  const [createDate] = useState(() => initialDate(day ? Number(day) : Date.now()));
  const [titleDraft, setTitle] = useState<string | null>(null);
  const [locDraft, setLoc] = useState<string | null>(null);
  const [dateDraft, setDate] = useState<Date | null>(null);
  const [assigneeDraft, setAssignee] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = titleDraft ?? existing?.title ?? '';
  const loc = locDraft ?? existing?.loc ?? '';
  const date = dateDraft ?? (existing ? new Date(existing.startsAt) : createDate);
  const assignee = assigneeDraft === undefined ? (existing?.assigneeUserId ?? null) : assigneeDraft;

  // Keep day/time edits independent: each picker preserves the other component.
  const setDay = (d: Date) => {
    const next = new Date(date);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setDate(next);
  };
  const setTime = (d: Date) => {
    const next = new Date(date);
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setDate(next);
  };

  const submit = async () => {
    if (!title.trim() || !spaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const startsAt = date.getTime();
      if (editing && id) {
        await update({
          eventId: id as Id<'calendarEvents'>,
          title: title.trim(),
          startsAt,
          loc: loc.trim() || undefined,
          clearLoc: loc.trim() ? undefined : true,
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
          clearAssignee: assignee === null ? true : undefined,
        });
      } else {
        await create({
          spaceId,
          title: title.trim(),
          startsAt,
          loc: loc.trim() || undefined,
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
        });
      }
      router.back();
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setBusy(false);
    }
  };

  const onDelete = () =>
    confirmDelete({
      title: 'Delete event?',
      onConfirm: async () => {
        if (id) await remove({ eventId: id as Id<'calendarEvents'> });
        router.back();
      },
    });

  // Deleted, or not visible to this account — never an editable empty form.
  if (editing && event === null) {
    return (
      <SheetShell kicker="Edit" title="Event" footerLabel="Close" footerIcon="x" onSubmit={() => router.back()}>
        <T size={15.5} weight={450} color={C.ink2} lh={1.5} style={{ marginBottom: 8 }}>
          This event isn&apos;t available anymore.
        </T>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      kicker={editing ? 'Edit' : 'New'}
      title="Event"
      footerLabel={busy ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
      onSubmit={submit}
      disabled={!title.trim() || busy}
      onDelete={editing ? onDelete : undefined}
      loading={editing && event === undefined}
      busy={busy}
      error={error}
    >
      <QField label="What's happening?" value={title} onChangeText={setTitle} placeholder="Coffee with Sam" big />
      {isShared && <QAssign members={members} value={assignee} onPick={setAssignee} />}
      <QPicker label="Day" value={date} onChange={setDay} mode="date" />
      <QPicker label="Time" value={date} onChange={setTime} mode="time" />
      <QField label="Where" value={loc} onChangeText={setLoc} placeholder="The studio" />
    </SheetShell>
  );
}
