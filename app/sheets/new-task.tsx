import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { Pill, PrimaryButton } from '@/src/components/ui/atoms';
import {
  SheetDateField,
  SheetSection,
  SheetIconLabelPicker,
  SheetRow,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useTaskLists } from '@/src/hooks/useTaskLists';
import { useTaskItems } from '@/src/hooks/useTasks';

type Priority = 'low' | 'med' | 'high';

const PRIORITY_NUM: Record<Priority, number> = { low: 1, med: 2, high: 3 };
const CUSTOM_DATE_LABEL = 'Date';

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
  return localDateIso(d);
}

function bucketLabelFor(buckets: Bucket[], dueDate: string | null): string {
  if (!dueDate) return 'Later';
  if (!isValidDateKey(dueDate)) return 'Later';
  for (const b of buckets) {
    if (b.offsetDays === null) continue;
    if (dueIso(b.offsetDays) === dueDate) return b.label;
  }
  return CUSTOM_DATE_LABEL;
}

function dateFromIso(value: string | null | undefined): Date {
  if (!value) return new Date();
  if (!isValidDateKey(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function localDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewTask() {
  const gate = useFeatureGate('tasks');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewTaskInner />;
}

function NewTaskInner() {
  const { listId, id } = useLocalSearchParams<{ listId?: string; id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { lists, isLoading: listsLoading } = useTaskLists();
  const taskItems = useTaskItems(listId ?? null) as ReturnType<typeof useTaskItems>;
  const { create, update, tasks, isLoading: tasksLoading } = taskItems;

  const list = lists.find((l) => l.id === listId) ?? null;
  const color = list ? ((C as any)[list.colorKey] as string) : C.gold;
  const priorityOptions = useMemo<IconLabelOption<Priority>[]>(
    () => [
      { key: 'low', priorityLevel: 'low', label: 'Low', color: C.ink3 },
      { key: 'med', priorityLevel: 'med', label: 'Medium', color: C.butter },
      { key: 'high', priorityLevel: 'high', label: 'High', color: C.accent },
    ],
    [C.accent, C.butter, C.ink3],
  );

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
  const [customDate, setCustomDate] = useState<Date>(() => dateFromIso(existing?.due_date));
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const canSave = title.trim().length > 0 && !!listId && !!list && (!isEdit || !!existing) && !saving;

  useEffect(() => {
    if (!isEdit || !existing) return;
    setTitle(String(existing.title ?? ''));
    setBucketLabel(bucketLabelFor(buckets, existing.due_date));
    setCustomDate(dateFromIso(existing.due_date));
    if (existing.priority >= 3) {
      setPriority('high');
    } else if (existing.priority === 1) {
      setPriority('low');
    } else {
      setPriority('med');
    }
  }, [buckets, existing, isEdit]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const bucket = buckets.find((b) => b.label === bucketLabel) ?? buckets[0];
      const dueDate =
        bucketLabel === CUSTOM_DATE_LABEL
          ? localDateIso(customDate)
          : dueIso(bucket.offsetDays);
      const payload = {
        title: trimmed,
        due_date: dueDate,
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
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!list) {
    return (
      <SheetShell
        eyebrow="TASK"
        eyebrowColor={color}
        title={listsLoading ? 'Loading list' : 'List missing'}
      >
        <Text style={{ color: C.ink2, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
          {listsLoading
            ? 'Loading this list…'
            : 'This task list could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  if (isEdit && !existing) {
    return (
      <SheetShell
        eyebrow="TASK"
        eyebrowColor={color}
        title={tasksLoading ? 'Loading task' : 'Task missing'}
      >
        <Text style={{ color: C.ink2, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
          {tasksLoading
            ? 'Loading this task…'
            : 'This task could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT TASK' : 'NEW TASK'}
      eyebrowColor={color}
      title={list?.name ?? (isEdit ? 'Edit task' : 'New task')}
      footer={
        <PrimaryButton
          icon="check"
          onPress={handleSave}
          disabled={!canSave}
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
        <SheetRow style={{ marginBottom: 10 }}>
          <SheetDateField
            pressTestID="new-task-date"
            value={customDate}
            onChange={(next) => {
              setBucketLabel(CUSTOM_DATE_LABEL);
              setCustomDate(next);
            }}
            accent={color}
          />
        </SheetRow>
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
        <SheetIconLabelPicker
          options={priorityOptions}
          selected={priority}
          onChange={setPriority}
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
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.lineColor,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: color,
            }}
          />
          <Text style={{ flex: 1, color: C.ink2, fontFamily: F.body, fontSize: 13 }}>
            {isEdit ? (
              <>Editing in <Text style={{ color: C.inkColor, fontFamily: F.bodyBold }}>{list.name}</Text></>
            ) : (
              <>Adding to <Text style={{ color: C.inkColor, fontFamily: F.bodyBold }}>{list.name}</Text></>
            )}
          </Text>
        </View>
      ) : null}
    </SheetShell>
  );
}
