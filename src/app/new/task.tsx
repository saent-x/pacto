import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { T } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { SheetShell, QField, QChips, QPriority, QAssign, QPicker } from '@/features/sheets/parts';
import { confirmDelete } from '@/lib/confirm';
import { initialDueOption, optionalDuePayload, optionalDueUpdatePayload, type DueOption } from '@/lib/taskDueDate';

const prioOf = (p: string) => (p === 'High' ? 'high' : p === 'Low' ? 'low' : 'med');
const prioLabel = (p?: string) => (p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Medium');
const NO_LIST = 'None';
const DUE_OPTIONS: DueOption[] = ['No date', 'Today', 'Tomorrow', 'Pick date'];

export default function NewTask() {
  const C = useColors();
  const router = useRouter();
  const { id, listId: listIdParam } = useLocalSearchParams<{ id?: string; listId?: string }>();
  const editing = !!id;
  const { spaceId, isShared, members } = useSpace();
  const create = useMutation(api.tasks.createTask);
  const update = useMutation(api.tasks.updateTask);
  const remove = useMutation(api.tasks.removeTask);

  // By id, not list+find: a push tap can open a task from a non-active space.
  const task = useQuery(api.tasks.getTask, editing ? { taskId: id as Id<'tasks'> } : 'skip');
  const existing = task ?? undefined;
  // List chips come from the task's own space so a cross-space edit can't show
  // (or attach) another space's lists. Create mode uses the active space.
  const listSpaceId = editing ? existing?.spaceId : spaceId;
  const lists = useQuery(api.taskLists.listLists, listSpaceId ? { spaceId: listSpaceId } : 'skip');

  const userLists = useMemo(() => lists ?? [], [lists]);
  const nameById = useMemo(() => new Map(userLists.map((l) => [l._id as string, l.name])), [userLists]);

  const [titleDraft, setTitle] = useState<string | null>(null);
  const [listNameDraft, setListName] = useState<string | undefined>(undefined);
  const [prioDraft, setPrio] = useState<string | undefined>(undefined);
  const [assigneeDraft, setAssignee] = useState<string | null | undefined>(undefined);
  const [dueOptionDraft, setDueOption] = useState<DueOption | null>(null);
  const [dueDateDraft, setDueDateDraft] = useState<Date | null>(null);
  // Untouched due controls send {} on update so the stored date/label survive edits.
  const [dueChanged, setDueChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const dueOption = dueOptionDraft ?? initialDueOption(existing?.dueLabel);
  const dueBase = dueDateDraft ?? (existing?.dueAt ? new Date(existing.dueAt) : new Date());

  // Resolve the chosen list name back to its id.
  const listId = useMemo(() => {
    const found = userLists.find((l) => l.name === listName);
    return found ? (found._id as Id<'taskLists'>) : undefined;
  }, [userLists, listName]);

  const submit = async () => {
    if (!title.trim() || !spaceId || busy) return;
    setBusy(true);
    setError(null);
    // 'Today'/'Tomorrow' are relative to NOW — dueBase may hold the task's old due
    // date (or a stale picker draft), which would write a past dueAt labeled 'Today'.
    const dueAnchor = dueOption === 'Pick date' ? dueBase : new Date();
    try {
      if (editing && id) {
        await update({
          taskId: id as Id<'tasks'>,
          title: title.trim(),
          listId,
          // Only an explicit 'None' pick clears — an untouched chip must not clear
          // a list from another space that simply has no name in this one.
          clearList: listNameDraft === NO_LIST ? true : undefined,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
          clearAssignee: assignee === null ? true : undefined,
          ...optionalDueUpdatePayload({ editing, dueChanged, option: dueOption, base: dueAnchor }),
        });
      } else {
        await create({
          spaceId,
          title: title.trim(),
          listId,
          priority: prioOf(prio) as 'low' | 'med' | 'high',
          assigneeUserId: assignee ? (assignee as Id<'users'>) : undefined,
          ...optionalDuePayload(dueOption, dueAnchor),
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
      title: 'Delete task?',
      onConfirm: async () => {
        if (id) await remove({ taskId: id as Id<'tasks'> });
        router.back();
      },
    });

  // Deleted, or not visible to this account — never an editable empty form.
  if (editing && task === null) {
    return (
      <SheetShell kicker="Edit" title="Task" footerLabel="Close" footerIcon="x" onSubmit={() => router.back()}>
        <T size={15.5} weight={450} color={C.ink2} lh={1.5} style={{ marginBottom: 8 }}>
          This task isn&apos;t available anymore.
        </T>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      kicker={editing ? 'Edit' : 'New'}
      title="Task"
      footerLabel={busy ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
      onSubmit={submit}
      disabled={!title.trim() || busy}
      onDelete={editing ? onDelete : undefined}
      loading={lists === undefined || (editing && task === undefined)}
      busy={busy}
      error={error}
    >
      <QField label="What needs doing?" value={title} onChangeText={setTitle} placeholder="Draft the studio invoice" big />
      {isShared && <QAssign members={members} value={assignee} onPick={setAssignee} />}
      {userLists.length > 0 && (
        <QChips label="List" options={[NO_LIST, ...userLists.map((l) => l.name)]} value={listName} onPick={setListName} />
      )}
      <QPriority value={prio} onPick={setPrio} />
      <QChips
        label="Due"
        options={DUE_OPTIONS}
        value={dueOption}
        onPick={(o) => {
          setDueOption(o as DueOption);
          setDueChanged(true);
        }}
      />
      {dueOption === 'Pick date' && (
        <QPicker
          label="Date"
          value={dueBase}
          onChange={(d) => {
            setDueDateDraft(d);
            setDueChanged(true);
          }}
          mode="date"
        />
      )}
    </SheetShell>
  );
}
