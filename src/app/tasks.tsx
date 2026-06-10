import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, TextInput } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors, useTheme } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { QScreen, SubBar, QSection, T, Kick, Div, Icon, Press, RoundBtn, Mono, Numeral, Bar, CollapsibleList } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';
import { QEmpty } from '@/art/motifs';
import { confirmDelete } from '@/lib/confirm';
import { isToday, startOfToday } from '@/lib/datetime';
import { dueLabelForDate } from '@/lib/taskDueDate';
import { useToday } from '@/lib/useNow';
import { priorityColor, priorityKeyOrNull } from '@/constants/priority';

const DAY_MS = 86_400_000;

export default function Tasks() {
  const C = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const { spaceId, isShared, members } = useSpace();
  const today = useToday();
  const skip = spaceId ? { spaceId } : 'skip';

  const tasks = useQuery(api.tasks.listTasks, skip);
  const lists = useQuery(api.taskLists.listLists, skip);
  // Flip `done` locally so the row responds on tap rather than after the round-trip.
  const toggleTask = useMutation(api.tasks.toggleTask).withOptimisticUpdate((store, { taskId }) => {
    if (!spaceId) return;
    const rows = store.getQuery(api.tasks.listTasks, { spaceId });
    if (!rows) return;
    store.setQuery(
      api.tasks.listTasks,
      { spaceId },
      rows.map((row) => (row._id === taskId ? { ...row, done: !row.done } : row)),
    );
  });
  const createList = useMutation(api.taskLists.createList);
  const removeList = useMutation(api.taskLists.removeList);
  const removeTask = useMutation(api.tasks.removeTask);

  const memberById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  const all = tasks ?? [];
  const open = all.filter((t) => !t.done);
  const done = all.filter((t) => t.done);

  // Group open tasks into sections: each user list, plus an "Inbox" for tasks
  // with no list. Sections render like the Reminders page (no filter tabs).
  const sections = useMemo(() => {
    const openTasks = (tasks ?? []).filter((t) => !t.done);
    const byList = new Map<string, typeof openTasks>();
    const inbox: typeof openTasks = [];
    for (const t of openTasks) {
      if (t.listId) {
        const arr = byList.get(t.listId) ?? [];
        arr.push(t);
        byList.set(t.listId, arr);
      } else {
        inbox.push(t);
      }
    }
    const out: { id: string | null; name: string; rows: typeof openTasks }[] = [];
    if (inbox.length) out.push({ id: null, name: 'Inbox', rows: inbox });
    for (const l of lists ?? []) out.push({ id: l._id, name: l.name, rows: byList.get(l._id) ?? [] });
    return out;
  }, [tasks, lists]);

  const addList = async () => {
    const name = newName.trim();
    if (!name || !spaceId || creatingList) return;
    setCreatingList(true);
    try {
      await createList({ spaceId, name });
      setNewName('');
      setNewMode(false);
    } finally {
      setCreatingList(false);
    }
  };

  const addHref = (listId: string | null) =>
    listId ? `/new/task?listId=${listId}` : '/new/task';

  const deleteList = (listId: string | null, name: string) => {
    if (!listId) return;
    confirmDelete({
      title: `Delete "${name}"?`,
      message: 'The list is removed — its tasks move to your Inbox.',
      onConfirm: () => removeList({ listId: listId as Id<'taskLists'> }),
    });
  };

  const deleteTask = (t: (typeof all)[number]) =>
    confirmDelete({
      title: 'Delete task?',
      message: `"${t.title}" will be removed.`,
      onConfirm: () => removeTask({ taskId: t._id }),
    });

  // Derive the due label from dueAt at render so 'Today'/'Tomorrow' never go
  // stale; the stored label is only a fallback for undated tasks.
  const dueLabelOf = (t: (typeof all)[number]): string | undefined => {
    if (!t.dueAt) return t.dueLabel;
    const now = today.getTime();
    if (isToday(t.dueAt, now)) return 'Today';
    if (isToday(t.dueAt, now + DAY_MS)) return 'Tomorrow';
    if (t.dueAt < startOfToday(now)) return `Overdue · ${dueLabelForDate(new Date(t.dueAt))}`;
    return dueLabelForDate(new Date(t.dueAt));
  };

  const Row = ({ t }: { t: (typeof all)[number] }) => {
    const uid = (t.assigneeUserId ?? t.createdBy) as Id<'users'>;
    const owner = memberById.get(uid);
    const due = dueLabelOf(t);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, opacity: t.done ? 0.55 : 1 }}>
        <Press
          scale={0.85}
          haptic
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityLabel={t.title}
          accessibilityState={{ checked: t.done }}
          onPress={() => toggleTask({ taskId: t._id }).catch(() => {})}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 24,
              borderWidth: 1.6,
              borderColor: t.done ? C.accent : C.line,
              backgroundColor: t.done ? C.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {t.done && <Icon name="check" size={13} color={C.onAccent} strokeWidth={3} />}
          </View>
        </Press>
        <Press onPress={() => router.push(`/new/task?id=${t._id}` as any)} haptic style={{ flex: 1 }}>
          <T
            size={16.5}
            weight={500}
            numberOfLines={1}
            color={t.done ? C.ink3 : C.ink}
            style={t.done ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
          >
            {t.title}
          </T>
          {(!!due || (isShared && owner)) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
              {!!due && <Kick color={C.ink3}>{due}</Kick>}
              {!!due && isShared && owner && (
                <View style={{ width: 3, height: 3, borderRadius: 3, backgroundColor: C.ink4 }} />
              )}
              {isShared && owner && (
                <Kick color={owner.isYou ? C.accent : C.ink3}>
                  {owner.isYou ? 'You' : owner.displayName.split(' ')[0]}
                </Kick>
              )}
            </View>
          )}
        </Press>
        <Icon
          name="flag"
          size={15}
          color={priorityKeyOrNull(t.priority) ? priorityColor(t.priority, isDark) : C.ink4}
          strokeWidth={2}
        />
        {isShared && owner && <MemberAvatar member={owner} size={28} />}
        <Press onPress={() => deleteTask(t)} haptic hitSlop={14} accessibilityLabel={`Delete ${t.title}`}>
          <Icon name="x" size={16} color={C.ink4} strokeWidth={2} />
        </Press>
      </View>
    );
  };

  return (
    <QScreen
      loading={tasks === undefined || lists === undefined}
      keyboardAvoiding
      header={
        <SubBar
          kicker="Tasks"
          right={
            <RoundBtn
              name="plus"
              fill={C.ink}
              color={C.bg}
              onPress={() => router.push('/new/task')}
              accessibilityLabel="New task"
            />
          }
        />
      }
    >
      {/* Lead */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 34 }}>
        <Numeral size={open.length > 99 ? 60 : open.length > 9 ? 78 : 92} lh={0.86}>
          {open.length}
        </Numeral>
        <View style={{ paddingBottom: 33 }}>
          <T size={17} weight={600} lh={1.25}>
            {isShared ? 'still to\nkeep, together' : 'still to\nkeep today'}
          </T>
        </View>
      </View>

      {/* Progress */}
      {all.length > 0 && (
        <View style={{ marginBottom: 30 }}>
          <Bar value={done.length / all.length} h={4} />
        </View>
      )}

      {/* List sections */}
      {sections.map((s) => (
        <View key={s.id ?? 'inbox'} style={{ marginBottom: 30 }}>
          <QSection
            label={
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Kick>{s.name} ·</Kick>
                <Mono size={11} weight={600} color={C.ink3} lh={1}>
                  {s.rows.length}
                </Mono>
              </View>
            }
            action={
              s.id != null ? (
                <Press onPress={() => deleteList(s.id, s.name)} haptic hitSlop={15} accessibilityLabel={`Delete ${s.name} list`}>
                  <Icon name="x" size={15} color={C.ink4} strokeWidth={2} />
                </Press>
              ) : undefined
            }
          />
          {s.rows.length === 0 ? (
            <Press
              onPress={() => router.push(addHref(s.id) as any)}
              haptic
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }}
            >
              <Icon name="plus" size={15} color={C.ink4} strokeWidth={2} />
              <T size={15.5} weight={500} color={C.ink4}>
                Add the first task
              </T>
            </Press>
          ) : (
            <CollapsibleList items={s.rows} limit={5}>
              {(t, i) => (
                <View key={t._id}>
                  {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                  <Row t={t} />
                </View>
              )}
            </CollapsibleList>
          )}
        </View>
      ))}

      {sections.length === 0 && <QEmpty kind="tasks" title="All kept." />}

      {/* New list — quiet inline creator: tap, type, Return. */}
      {newMode ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 9,
            borderBottomWidth: 1.5,
            borderBottomColor: newName.trim() ? C.accent : C.line,
          }}
        >
          <Icon name="plus" size={15} color={C.accent} strokeWidth={2.2} />
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Name your list"
            placeholderTextColor={C.ink2}
            autoFocus
            editable={!creatingList}
            returnKeyType="done"
            onSubmitEditing={addList}
            onBlur={() => {
              if (!creatingList && !newName.trim()) setNewMode(false);
            }}
            style={{ flex: 1, fontFamily: FONTS.sans500, fontSize: 16.5, color: C.ink }}
          />
          {newName.trim() ? (
            <Press onPress={addList} haptic hitSlop={8} disabled={creatingList}>
              <Kick color={C.accent}>Create</Kick>
            </Press>
          ) : (
            <Press onPress={() => setNewMode(false)} haptic hitSlop={8} accessibilityLabel="Cancel new list">
              <Icon name="x" size={16} color={C.ink4} strokeWidth={2} />
            </Press>
          )}
        </View>
      ) : (
        <Press
          onPress={() => setNewMode(true)}
          haptic
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 }}
        >
          <Icon name="plus" size={15} color={C.ink3} strokeWidth={2.2} />
          <T size={15.5} weight={500} color={C.ink3}>
            New list
          </T>
        </Press>
      )}

      {/* Done */}
      {done.length > 0 && (
        <View style={{ marginTop: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Kick>Done ·</Kick>
            <Mono size={11} weight={600} color={C.ink3} lh={1}>
              {done.length}
            </Mono>
          </View>
          <View style={{ opacity: 0.5 }}>
            <CollapsibleList items={done} limit={5}>
              {(t, i) => (
                <View key={t._id}>
                  {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                  <Row t={t} />
                </View>
              )}
            </CollapsibleList>
          </View>
        </View>
      )}
    </QScreen>
  );
}
