import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useTaskLists } from '@/src/hooks/useTaskLists';
import { useTaskItems } from '@/src/hooks/useTasks';

const PRIORITIES: { k: 'low' | 'med' | 'high'; icon: IconName; dots: number; num: number }[] = [
  { k: 'low', icon: 'arrowDown', dots: 1, num: 1 },
  { k: 'med', icon: 'minus', dots: 2, num: 2 },
  { k: 'high', icon: 'chevronsUp', dots: 3, num: 3 },
];

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Bucket = { label: string; offsetDays: number | null };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildBuckets(now: Date = new Date()): Bucket[] {
  const nextMonthIndex = (now.getMonth() + 1) % 12;
  const nextMonthYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const firstOfNextMonth = new Date(nextMonthYear, nextMonthIndex, 1);
  const offsetDays = Math.round(
    (firstOfNextMonth.getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  return [
    { label: 'Today', offsetDays: 0 },
    { label: 'Tomorrow', offsetDays: 1 },
    { label: 'This week', offsetDays: 3 },
    { label: MONTH_LABELS[nextMonthIndex], offsetDays },
    { label: 'Later', offsetDays: null },
  ];
}

function dueIso(offsetDays: number | null): string | null {
  if (offsetDays === null) return null;
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function bucketLabelFor(buckets: Bucket[], dueDate: string | null): string {
  if (!dueDate) return 'Later';
  for (const b of buckets) {
    if (b.offsetDays === null) continue;
    if (dueIso(b.offsetDays) === dueDate) return b.label;
  }
  return 'Later';
}

export default function NewTask() {
  const { listId, id } = useLocalSearchParams<{ listId?: string; id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { lists } = useTaskLists();
  const taskItems = useTaskItems(listId ?? null) as ReturnType<typeof useTaskItems>;
  const { create, update, tasks } = taskItems;

  const list = lists.find((l) => l.id === listId) ?? null;
  const color = list ? ((C as any)[list.colorKey] as string) : C.gold;
  const listInk = list ? (((C as any)[`${list.colorKey}Ink`] as string | undefined) ?? C.ink) : C.ink;

  const buckets = useMemo(() => buildBuckets(), []);
  const existing = useMemo(
    () => (isEdit && id ? tasks.find((t) => t.id === id) : undefined),
    [isEdit, id, tasks],
  );

  const initialPriority = ((): 'low' | 'med' | 'high' => {
    if (!existing) return 'med';
    if (existing.priority >= 3) return 'high';
    if (existing.priority === 1) return 'low';
    return 'med';
  })();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [bucketLabel, setBucketLabel] = useState<string>(
    existing ? bucketLabelFor(buckets, existing.due_date) : buckets[0].label,
  );
  const [priority, setPriority] = useState<'low' | 'med' | 'high'>(initialPriority);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || !listId || saving) return;
    setSaving(true);
    try {
      const prio = PRIORITIES.find((p) => p.k === priority)!.num;
      const bucket = buckets.find((b) => b.label === bucketLabel) ?? buckets[0];
      if (isEdit && id) {
        await update(id, {
          title: trimmed,
          due_date: dueIso(bucket.offsetDays),
          priority: prio,
        });
      } else {
        await create({
          title: trimmed,
          due_date: dueIso(bucket.offsetDays),
          priority: prio,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-task] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT TASK' : 'NEW TASK'}
      eyebrowColor={color}
      title={list?.name ?? (isEdit ? 'Edit task.' : 'Quick task.')}
      footer={
        <PrimaryButton
          icon="check"
          onPress={handleSave}
          disabled={!title.trim() || !listId || saving}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
        </PrimaryButton>
      }
    >
      <Overline style={{ marginBottom: 8 }}>What needs doing</Overline>
      <TextInput
        testID="new-task-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Pack travel documents..."
        placeholderTextColor={C.fog}
        autoFocus
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: title ? color : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>When</Overline>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {buckets.map((b) => (
            <Pill
              key={b.label}
              testID={`new-task-bucket-${b.label}`}
              active={bucketLabel === b.label}
              activeBg={`${color}33`}
              activeColor={color}
              onPress={() => setBucketLabel(b.label)}
            >
              {b.label}
            </Pill>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Priority</Overline>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRIORITIES.map((p) => {
            const sel = priority === p.k;
            return (
              <Pressable
                key={p.k}
                testID={`new-task-priority-${p.k}`}
                onPress={() => setPriority(p.k)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: sel ? `${color}26` : 'transparent',
                  borderWidth: 1,
                  borderColor: sel ? color : C.line,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name={p.icon} size={18} color={sel ? color : C.mist} strokeWidth={2.5} />
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor:
                          i < p.dots ? (sel ? color : C.mist) : sel ? `${color}33` : C.line,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {list ? (
        <View
          style={{
            marginTop: 22,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={list.icon} size={14} color={listInk} />
          </View>
          <Text style={{ flex: 1, color: C.mist, fontFamily: F.body, fontSize: 13 }}>
            {isEdit ? (
              <>Editing in <Text style={{ color: C.bone, fontFamily: F.bodyBold }}>{list.name}</Text></>
            ) : (
              <>Adding to <Text style={{ color: C.bone, fontFamily: F.bodyBold }}>{list.name}</Text></>
            )}
          </Text>
        </View>
      ) : null}
    </SheetShell>
  );
}
