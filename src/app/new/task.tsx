import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useSpace } from '@/features/account/SpaceProvider';
import { SheetShell, QField, QChips, QPriority, QAssign, QPicker } from '@/features/sheets/parts';
import { confirmDelete } from '@/lib/confirm';
import { dueDateFromOption, dueLabelForDate } from '@/lib/taskDueDate';

const prioOf = (p: string) => (p === 'High' ? 'high' : p === 'Low' ? 'low' : 'med');
const prioLabel = (p?: string) => (p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Medium');
const NO_LIST = 'None';

export default function NewTask() {
  const router = useRouter();
  const { id, listId: listIdParam } = useLocalSearchParams<{ id?: string; listId?: string }>();
  const editing = !!id;
  const { spaceId, isShared, members } = useSpace();
  const create = useMutation(api.tasks.createTask);
  const update = useMutation(api.tasks.updateTask);
  const remove = useMutation(api.tasks.removeTask);

  const tasks = useQuery(api.tasks.listTasks, editing && spaceId ? { spaceId } : 'skip');
  const lists = useQuery(api.taskLists.listLists, spaceId ? { spaceId } : 'skip');
  const existing = editing ? tasks?.find((t) => t._id === id) : undefined;

  const userLists = useMemo(() => lists ?? [], [lists]);
  const nameById = useMemo(() => new Map(userLists.map((l) => [l._id as string, l.name])), [userLists]);

  const [titleDraft, setTitle] = useState<string | null>(null);
  const [listNameDraft, setListName] = useState<string | undefined>(undefined);
  const [prioDraft, setPrio] = useState<string | undefined>(undefined);
  const [assigneeDraft, setAssignee] = useState<string | null | undefined>(undefined);
  const [dueDateDraft, setDueDateDraft] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const initialListName = editing
    ? existing?.listId
      ? (nameById.get(existing.listId) ?? NO_LIST)
      : NO_LIST
    : listIdParam
      ? (nameById.get(listIdParam) ?? NO_LIST)
      : NO_LIST;
  const title = titleDraft ?? existing?.title ?? '';
  const listName = listNameDraft ?? initialListName;
  const prio = prioDraft ?? prioLabel(existing?.priority);
  const assignee = assigneeDraft === undefined ? (existing?.assigneeUserId ?? null) : assigneeDraft;
  const dueDate =
    dueDateDraft ?? (existing?.dueAt ? new Date(existing.dueAt) : dueDateFromOption('Today', new Date()));

  // Resolve the chosen list name back to its id.
  const listId = useMemo(() => {
    const found = userLists.find((l) => l.name === listName);
    return found ? (found._id as Id<'taskLists'>) : undefined;
  }, [userLists, listName]);

  const submit = async () => {
    if (!title.trim() || !spaceId || busy) return;
    setBusy(true);
    const due = { dueAt: dueDate.getTime(), dueLabel: dueLabelForDate(dueDate) };
    try {
      if (editing && id) {
        await update({
          taskId: id as Id<'tasks'>,
          title: title.trim(),
          listId,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
          ...due,
        });
      } else {
        await create({
          spaceId,
          title: title.trim(),
          listId,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
          ...due,
        });
      }
      router.back();
    } catch {
      setBusy(false);
    }
  };

  const onDelete = () =>
    confirmDelete({
      title: 'Delete task?',
      onConfirm: async () => {
        if (id) await remove({ taskId: id as Id<'tasks'> });
        router.back();
      },
    });

  return (
    <SheetShell
      kicker={editing ? 'Edit' : 'New'}
      title="Task"
      footerLabel={busy ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
      onSubmit={submit}
      disabled={!title.trim() || busy}
      onDelete={editing ? onDelete : undefined}
      loading={lists === undefined || (editing && tasks === undefined)}
    >
      <QField label="What needs doing?" value={title} onChangeText={setTitle} placeholder="Draft the studio invoice" big />
      {isShared && <QAssign members={members} value={assignee} onPick={setAssignee} />}
      {userLists.length > 0 && (
        <QChips label="List" options={[NO_LIST, ...userLists.map((l) => l.name)]} value={listName} onPick={setListName} />
      )}
      <QPriority value={prio} onPick={setPrio} />
      <QPicker label={`Due · ${dueLabelForDate(dueDate)}`} value={dueDate} onChange={setDueDateDraft} mode="date" />
    </SheetShell>
  );
}
