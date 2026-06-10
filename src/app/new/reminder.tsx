import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { T } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { SheetShell, QField, QChips, QPriority, QPicker, QAssign } from '@/features/sheets/parts';
import { confirmDelete } from '@/lib/confirm';
import { fmtTime } from '@/lib/datetime';

const prioOf = (p: string) => (p === 'High' ? 'high' : p === 'Low' ? 'low' : 'med');
const prioLabel = (p?: string) => (p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Medium');
const todayAtDate = (h: number) => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d;
};

export default function NewReminder() {
  const C = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { spaceId, isShared, members } = useSpace();
  const create = useMutation(api.reminders.createReminder);
  const update = useMutation(api.reminders.updateReminder);
  const remove = useMutation(api.reminders.removeReminder);

  // By id, not list+find: a push tap can open a reminder from a non-active space.
  const reminder = useQuery(api.reminders.getReminder, editing ? { reminderId: id as Id<'reminders'> } : 'skip');
  const existing = reminder ?? undefined;

  const [createTime] = useState(() => todayAtDate(18));
  const [titleDraft, setTitle] = useState<string | null>(null);
  const [timeDraft, setTime] = useState<Date | null>(null);
  const [repeatDraft, setRepeat] = useState<string | undefined>(undefined);
  const [prioDraft, setPrio] = useState<string | undefined>(undefined);
  const [assigneeDraft, setAssignee] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = titleDraft ?? existing?.title ?? '';
  const time = timeDraft ?? (existing?.remindAt ? new Date(existing.remindAt) : createTime);
  const repeat = repeatDraft ?? existing?.repeat ?? 'Daily';
  const prio = prioDraft ?? prioLabel(existing?.priority);
  const assignee = assigneeDraft === undefined ? (existing?.assigneeUserId ?? null) : assigneeDraft;

  const submit = async () => {
    if (!title.trim() || !spaceId || busy) return;
    setBusy(true);
    setError(null);
    const remindAt = time.getTime();
    // Capture the device timezone so recurring reminders fire at the same local
    // time/day (DST/weekday/month-correct) regardless of where the server runs.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      if (editing && id) {
        await update({
          reminderId: id as Id<'reminders'>,
          title: title.trim(),
          remindAt,
          whenLabel: fmtTime(remindAt),
          repeat,
          tz,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
          clearAssignee: assignee === null ? true : undefined,
        });
      } else {
        await create({
          spaceId,
          title: title.trim(),
          repeat,
          remindAt,
          whenLabel: fmtTime(remindAt),
          tz,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
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
      title: 'Delete reminder?',
      onConfirm: async () => {
        if (id) await remove({ reminderId: id as Id<'reminders'> });
        router.back();
      },
    });

  // Deleted, or not visible to this account — never an editable empty form.
  if (editing && reminder === null) {
    return (
      <SheetShell kicker="Edit" title="Reminder" footerLabel="Close" footerIcon="x" onSubmit={() => router.back()}>
        <T size={15.5} weight={450} color={C.ink2} lh={1.5} style={{ marginBottom: 8 }}>
          This reminder isn&apos;t available anymore.
        </T>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      kicker={editing ? 'Edit' : 'New'}
      title="Reminder"
      footerLabel={busy ? 'Saving…' : editing ? 'Save changes' : 'Set reminder'}
      onSubmit={submit}
      disabled={!title.trim() || busy}
      onDelete={editing ? onDelete : undefined}
      loading={editing && reminder === undefined}
      busy={busy}
      error={error}
    >
      <QField label="Remind me to" value={title} onChangeText={setTitle} placeholder="Water the monstera" big />
      {isShared && <QAssign members={members} value={assignee} onPick={setAssignee} />}
      <QPicker label="Time" value={time} onChange={setTime} mode="time" />
      <QChips label="Repeat" options={['Once', 'Daily', 'Weekdays', 'Weekly', 'Monthly']} value={repeat} onPick={setRepeat} />
      <QPriority value={prio} onPick={setPrio} />
    </SheetShell>
  );
}
