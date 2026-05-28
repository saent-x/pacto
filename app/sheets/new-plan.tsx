import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import {
  SheetDateField,
  SheetIconLabelPicker,
  SheetRow,
  SheetSection,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { usePlans } from '@/src/hooks/usePlans';
import { useSession } from '@/src/hooks/useSession';
import {
  TARGET_COLOR_KEYS,
  colorValueForKey,
  pickRandomUnusedColorKey,
  resolveColorKey,
  type TargetColorKey,
} from '@/src/lib/color-cycle';
import { useTheme } from '@/src/lib/theme';

type Priority = 'low' | 'med' | 'high';
type Visibility = 'personal' | 'shared';

const PRIORITY_NUM: Record<Priority, number> = {
  low: 1,
  med: 2,
  high: 3,
};

function priorityFromNumber(value: unknown): Priority {
  const n = Number(value ?? 2);
  if (n >= 3) return 'high';
  if (n <= 1) return 'low';
  return 'med';
}

function dateFromIso(value: unknown): Date {
  if (typeof value !== 'string' || value.length === 0) return new Date();
  if (!isValidDateKey(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function bucketForTargetDate(date: Date, now = new Date()): string {
  if (date.getFullYear() !== now.getFullYear()) return 'Someday';
  if (date.getMonth() === now.getMonth()) return 'This month';
  return 'Later this year';
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
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

export default function NewPlan() {
  const gate = useFeatureGate('goals');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewPlanInner />;
}

function NewPlanInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C } = useTheme();
  const { create, update, plans, isLoading } = usePlans();
  const { isSolo } = useSession();
  const existing = useMemo(
    () => (isEdit && id ? plans.find((p) => p.id === id) : undefined),
    [isEdit, id, plans],
  );
  const defaultColorKey = useMemo(
    () => pickRandomUnusedColorKey(TARGET_COLOR_KEYS, plans, C),
    [C, plans],
  );
  const existingColorKey = useMemo(
    () => resolveColorKey(existing, TARGET_COLOR_KEYS, C),
    [C, existing],
  );
  const priorityOptions = useMemo<IconLabelOption<Priority>[]>(
    () => [
      { key: 'low', priorityLevel: 'low', label: 'Low', color: C.ink3 },
      { key: 'med', priorityLevel: 'med', label: 'Medium', color: C.butter },
      { key: 'high', priorityLevel: 'high', label: 'High', color: C.accent },
    ],
    [C.accent, C.butter, C.ink3],
  );
  const visibilityOptions = useMemo<IconLabelOption<Visibility>[]>(
    () => [
      { key: 'personal', icon: 'lock', label: 'Just me', color: C.sky },
      { key: 'shared', icon: 'users', label: 'Together', color: C.gold },
    ],
    [C.gold, C.sky],
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [colorKey, setColorKey] = useState<TargetColorKey>(
    existingColorKey ?? defaultColorKey,
  );
  const [priority, setPriority] = useState<Priority>(
    priorityFromNumber(existing?.priority),
  );
  const [visibility, setVisibility] = useState<Visibility>(
    existing?.isPrivate || isSolo ? 'personal' : 'shared',
  );
  const [targetDate, setTargetDate] = useState<Date>(() => dateFromIso(existing?.targetDate));
  const [targetDateTouched, setTargetDateTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const color = colorValueForKey(C, colorKey);
  const existingTargetDateValid = isValidDateKey(existing?.targetDate);

  const canSave = title.trim().length > 0 && (!isEdit || !!existing) && !saving;

  useEffect(() => {
    if (isEdit && existingColorKey) {
      setColorKey(existingColorKey);
      return;
    }
    if (!isEdit) setColorKey(defaultColorKey);
  }, [defaultColorKey, existingColorKey, isEdit]);

  useEffect(() => {
    if (!isEdit || !existing) return;
    setTitle(String(existing.title ?? ''));
    setPriority(priorityFromNumber(existing.priority));
    setTargetDate(dateFromIso(existing.targetDate));
    setTargetDateTouched(false);
    setVisibility(existing.isPrivate || isSolo ? 'personal' : 'shared');
  }, [existing, isEdit, isSolo]);

  const onSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const shouldPersistTargetDate = !isEdit || targetDateTouched || existingTargetDateValid;
      const targetDateValue = shouldPersistTargetDate ? format(targetDate, 'yyyy-MM-dd') : null;
      const inferredBucket = targetDateValue
        ? bucketForTargetDate(targetDate)
        : existing?.bucket ?? existing?.category ?? 'Someday';
      const payload = {
        title: title.trim(),
        description: null,
        category: inferredBucket,
        bucket: inferredBucket,
        color,
        colorKey,
        priority: PRIORITY_NUM[priority],
        isPrivate: isSolo ? true : visibility === 'personal',
        targetDate: targetDateValue,
        status: existing?.status ?? 'active',
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-plan] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (isEdit && !existing) {
    return (
      <SheetShell
        eyebrow="TARGET"
        eyebrowColor={color}
        title={isLoading ? 'Loading target' : 'Target missing'}
      >
        <Text style={{ color: C.ink2 }}>
          {isLoading
            ? 'Loading this target…'
            : 'This target could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT TARGET' : 'NEW TARGET'}
      eyebrowColor={color}
      title={isEdit ? 'Edit target' : 'New target'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create target'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Title" first>
        <SheetTitleField
          testID="new-plan-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="Name your target…"
          accent={color}
        />
      </SheetSection>

      <SheetSection title="When">
        <SheetRow>
          <SheetDateField
            pressTestID="new-plan-target-date"
            value={targetDate}
            onChange={(value) => {
              setTargetDateTouched(true);
              setTargetDate(value);
            }}
            accent={color}
          />
        </SheetRow>
      </SheetSection>

      <SheetSection title="Priority">
        <SheetIconLabelPicker
          options={priorityOptions}
          selected={priority}
          onChange={setPriority}
          testIDPrefix="new-plan-priority"
        />
      </SheetSection>

      {!isSolo && (
        <SheetSection title="Visibility">
          <SheetIconLabelPicker
            options={visibilityOptions}
            selected={visibility}
            onChange={setVisibility}
            testIDPrefix="new-plan-visibility"
          />
        </SheetSection>
      )}
    </SheetShell>
  );
}
