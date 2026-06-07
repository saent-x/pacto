import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
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
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { spaceId, isShared, members } = useSpace();
  const create = useMutation(api.reminders.createReminder);
  const update = useMutation(api.reminders.updateReminder);
  const remove = useMutation(api.reminders.removeReminder);

  const reminders = useQuery(api.reminders.listReminders, editing && spaceId ? { spaceId } : 'skip');
  const existing = editing ? reminders?.find((r) => r._id === id) : undefined;

  const [createTime] = useState(() => todayAtDate(18));
  const [titleDraft, setTitle] = useState<string | null>(null);
  const [timeDraft, setTime] = useState<Date | null>(null);
  const [repeatDraft, setRepeat] = useState<string | undefined>(undefined);
  const [prioDraft, setPrio] = useState<string | undefined>(undefined);
  const [assigneeDraft, setAssignee] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const title = titleDraft ?? existing?.title ?? '';
  const time = timeDraft ?? (existing?.remindAt ? new Date(existing.remindAt) : createTime);
  const repeat = repeatDraft ?? existing?.repeat ?? 'Daily';
  const prio = prioDraft ?? prioLabel(existing?.priority);
  const assignee = assigneeDraft === undefined ? (existing?.assigneeUserId ?? null) : assigneeDraft;

  const submit = async () => {
    if (!title.trim() || !spaceId || busy) return;
    setBusy(true);
    const remindAt = time.getTime();
    try {
      if (editing && id) {
        await update({
          reminderId: id as Id<'reminders'>,
          title: title.trim(),
          remindAt,
          whenLabel: fmtTime(remindAt),
          repeat,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
        });
      } else {
        await create({
          spaceId,
          title: title.trim(),
          repeat,
          remindAt,
          whenLabel: fmtTime(remindAt),
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
        });
      }
      router.back();
    } catch {
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

  return (
    <SheetShell
      kicker={editing ? 'Edit' : 'New'}
      title="Reminder"
      footerLabel={busy ? 'Saving…' : editing ? 'Save changes' : 'Set reminder'}
      onSubmit={submit}
      disabled={!title.trim() || busy}
      onDelete={editing ? onDelete : undefined}
      loading={editing && reminders === undefined}
    >
      <QField label="Remind me to" value={title} onChangeText={setTitle} placeholder="Water the monstera" big />
      {isShared && <QAssign members={members} value={assignee} onPick={setAssignee} />}
      <QPicker label="Time" value={time} onChange={setTime} mode="time" />
      <QChips label="Repeat" options={['Once', 'Daily', 'Weekdays', 'Weekly', 'Monthly']} value={repeat} onPick={setRepeat} />
      <QPriority value={prio} onPick={setPrio} />
    </SheetShell>
  );
}
