import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import {
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTitleField,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useTaskLists } from '@/src/hooks/useTaskLists';
import { useTaskItems } from '@/src/hooks/useTasks';

type Priority = 'low' | 'med' | 'high';

const PRIORITY_NUM: Record<Priority, number> = { low: 1, med: 2, high: 3 };
const PRIORITY_OPTS: SegmentOption<Priority>[] = [
  { key: 'low', label: 'Low' },
  { key: 'med', label: 'Med' },
  { key: 'high', label: 'High' },
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

  const initialPriority: Priority = (() => {
    if (!existing) return 'med';
    if (existing.priority >= 3) return 'high';
    if (existing.priority === 1) return 'low';
    return 'med';
  })();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [bucketLabel, setBucketLabel] = useState<string>(
    existing ? bucketLabelFor(buckets, existing.due_date) : buckets[0].label,
  );
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || !listId || saving) return;
    setSaving(true);
    try {
      const bucket = buckets.find((b) => b.label === bucketLabel) ?? buckets[0];
      const payload = {
        title: trimmed,
        due_date: dueIso(bucket.offsetDays),
        priority: PRIORITY_NUM[priority],
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
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
      title={list?.name ?? (isEdit ? 'Edit task' : 'New task')}
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
      <SheetSection title="What needs doing" first>
        <SheetTitleField
          testID="new-task-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="What needs doing…"
          accent={color}
          autoFocus
        />
      </SheetSection>

      <SheetSection title="When">
        {/* EXCEPTION: relative-time labels (Today/Tomorrow/etc) — no meaningful icon mapping */}
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
      </SheetSection>

      <SheetSection title="Priority">
        <SheetSegment
          options={PRIORITY_OPTS}
          selected={priority}
          onChange={setPriority}
          accent={color}
          testIDPrefix="new-task-priority"
        />
      </SheetSection>

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
