import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import {
  SheetDateField,
  SheetIconLabelPicker,
  SheetLabel,
  SheetRow,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTimeField,
  SheetTitleField,
  type IconLabelOption,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
import { useReminders } from '@/src/hooks/useReminders';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type Repeat = 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type StoredRepeat = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Assignee = 'both' | 'me' | 'partner';
type Visibility = 'personal' | 'shared';

const REPEAT_OPTS: SegmentOption<Repeat>[] = [
  { key: 'None', label: 'None' },
  { key: 'Daily', label: 'Daily' },
  { key: 'Weekly', label: 'Weekly' },
  { key: 'Monthly', label: 'Monthly' },
  { key: 'Yearly', label: 'Yearly' },
];

function defaultDueDate() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setSeconds(0, 0);
  return d;
}

function dateFromIso(value: unknown): Date {
  if (typeof value !== 'string' || value.length === 0) return defaultDueDate();
  if (!isValidTimestampString(value)) return defaultDueDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? defaultDueDate() : parsed;
}

function hasValidDatePrefix(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return true;
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

function isValidTimestampString(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (!hasValidDatePrefix(value)) return false;
  return Number.isFinite(new Date(value).getTime());
}

function repeatFromValue(value: unknown): Repeat {
  if (typeof value !== 'string' || value.length === 0) return 'None';
  const normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return REPEAT_OPTS.some((option) => option.key === normalized)
    ? (normalized as Repeat)
    : 'None';
}

function storedRepeatValue(repeat: Repeat): StoredRepeat | null {
  if (repeat === 'None') return null;
  return repeat.toLowerCase() as StoredRepeat;
}

function assigneeFromReminder(
  reminder: { assigned_to?: string | null } | null | undefined,
  userId?: string | null,
  partnerId?: string | null,
  isSolo?: boolean,
): Assignee {
  if (isSolo) return 'me';
  if (!reminder?.assigned_to) return 'both';
  if (reminder.assigned_to === userId) return 'me';
  if (reminder.assigned_to === partnerId) return 'partner';
  return 'both';
}

export default function NewReminder() {
  const gate = useFeatureGate('recurring');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewReminderInner />;
}

function NewReminderInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C } = useTheme();
  const { user, activeCouple, isSolo } = useSession();
  const { create, update, reminders, isLoading } = useReminders();
  const partnerId = activeCouple?.partner?.id ?? null;
  const existing = useMemo(
    () => (isEdit && id ? reminders.find((reminder) => reminder.id === id) : undefined),
    [id, isEdit, reminders],
  );

  const [title, setTitle] = useState(existing?.title ?? '');
  const [assignee, setAssignee] = useState<Assignee>(
    assigneeFromReminder(existing, user?.id, partnerId, isSolo),
  );
  const [repeat, setRepeat] = useState<Repeat>(repeatFromValue(existing?.recurrence));
  const [visibility, setVisibility] = useState<Visibility>(
    existing?.scope === 'personal' || isSolo ? 'personal' : 'shared',
  );
  const [due, setDue] = useState<Date>(() => dateFromIso(existing?.due_at));
  const [dueTouched, setDueTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const partnerName = activeCouple?.partner?.displayName ?? 'Partner';
  const assigneeOptions: SegmentOption<Assignee>[] = useMemo(
    () =>
      isSolo
        ? [{ key: 'me', label: 'Me' }]
        : [
            { key: 'both', label: 'Both' },
            { key: 'me', label: 'Me' },
            { key: 'partner', label: partnerName },
          ],
    [isSolo, partnerName],
  );
  const visibilityOptions = useMemo<IconLabelOption<Visibility>[]>(
    () => [
      { key: 'personal', icon: 'lock', label: 'Just me', color: C.sky },
      { key: 'shared', icon: 'users', label: 'Together', color: C.gold },
    ],
    [C.gold, C.sky],
  );
  const effectiveVisibility: Visibility = isSolo ? 'personal' : visibility;
  const canSave = title.trim().length > 0 && (!isEdit || !!existing) && !saving;
  const existingDueValid = isValidTimestampString(existing?.due_at);

  useEffect(() => {
    if (isSolo) {
      setVisibility('personal');
      setAssignee('me');
    }
  }, [isSolo]);

  useEffect(() => {
    if (!isEdit || !existing) return;
    setTitle(String(existing.title ?? ''));
    setAssignee(assigneeFromReminder(existing, user?.id, partnerId, isSolo));
    setRepeat(repeatFromValue(existing.recurrence));
    setVisibility(existing.scope === 'personal' || isSolo ? 'personal' : 'shared');
    setDue(dateFromIso(existing.due_at));
    setDueTouched(false);
  }, [existing, isEdit, isSolo, partnerId, user?.id]);

  const onVisibilityChange = (next: Visibility) => {
    setVisibility(next);
    if (next === 'personal') setAssignee('me');
  };

  const onSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const assignedId =
      effectiveVisibility === 'personal'
        ? user?.id ?? null
        : assignee === 'both'
        ? null
        : assignee === 'me'
          ? user?.id ?? null
          : partnerId;
    try {
      const basePayload = {
        title: title.trim(),
        description: null,
        priority: 2,
        recurrence: storedRepeatValue(repeat),
        assigned_to: assignedId,
        scope: effectiveVisibility,
      };
      if (isEdit && id) {
        const shouldPersistDue = dueTouched || existingDueValid;
        await update(id, {
          ...basePayload,
          ...(shouldPersistDue ? { due_at: due.toISOString() } : {}),
        });
      } else {
        await create({ ...basePayload, due_at: due.toISOString() });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-reminder] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (isEdit && !existing) {
    return (
      <SheetShell
        eyebrow="REMINDER"
        eyebrowColor={C.reminders}
        title={isLoading ? 'Loading reminder' : 'Reminder missing'}
      >
        <Text style={{ color: C.ink2 }}>
          {isLoading
            ? 'Loading this reminder…'
            : 'This reminder could not be found or is no longer available in this space.'}
        </Text>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT REMINDER' : 'NEW REMINDER'}
      eyebrowColor={C.reminders}
      title={isEdit ? 'Edit reminder' : 'New reminder'}
      footer={
        <PrimaryButton icon="check" onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save reminder'}
        </PrimaryButton>
      }
    >
      <SheetSection title="What to remember" first>
        <SheetTitleField
          testID="new-reminder-title"
          value={title}
          onChangeText={setTitle}
          placeholder="What to remember…"
          accent={C.reminders}
        />
      </SheetSection>

      <SheetSection title="When">
        <SheetRow>
          <SheetDateField
            pressTestID="new-reminder-date"
            value={due}
            onChange={(value) => {
              setDueTouched(true);
              setDue(value);
            }}
            accent={C.reminders}
            minimumDate={new Date()}
          />
          <SheetTimeField
            pressTestID="new-reminder-time"
            value={due}
            onChange={(value) => {
              setDueTouched(true);
              setDue(value);
            }}
            accent={C.reminders}
          />
        </SheetRow>
      </SheetSection>

      {!isSolo ? (
        <SheetSection title="Visibility">
          <SheetIconLabelPicker
            options={visibilityOptions}
            selected={visibility}
            onChange={onVisibilityChange}
            testIDPrefix="new-reminder-visibility"
          />
        </SheetSection>
      ) : null}

      <SheetSection title="Repeat">
        <SheetSegment
          options={REPEAT_OPTS}
          selected={repeat}
          onChange={setRepeat}
          accent={C.reminders}
          testIDPrefix="new-reminder-repeat"
        />
      </SheetSection>

      {assigneeOptions.length > 1 && effectiveVisibility === 'shared' ? (
        <View style={{ marginTop: 22 }}>
          <SheetLabel style={{ marginBottom: 10 }}>Assign to</SheetLabel>
          <SheetSegment
            options={assigneeOptions}
            selected={assignee}
            onChange={setAssignee}
            accent={C.reminders}
            testIDPrefix="new-reminder-assignee"
          />
        </View>
      ) : null}
    </SheetShell>
  );
}
