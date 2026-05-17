import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import {
  SheetDateField,
  SheetIconGrid,
  SheetLabel,
  SheetRow,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTimeField,
  SheetTitleField,
  type IconOption,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
import { useReminders } from '@/src/hooks/useReminders';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type CatKey = 'General' | 'DateNight' | 'Anniversary' | 'Health' | 'Bills' | 'Travel';
type Repeat = 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type Assignee = 'both' | 'me' | 'partner';

const CATS: (IconOption<CatKey> & { label: string })[] = [
  { key: 'General', icon: 'bookmark', label: 'General' },
  { key: 'DateNight', icon: 'heart', label: 'Date night' },
  { key: 'Anniversary', icon: 'gift', label: 'Anniversary' },
  { key: 'Health', icon: 'activity', label: 'Health' },
  { key: 'Bills', icon: 'creditCard', label: 'Bills' },
  { key: 'Travel', icon: 'mapPin', label: 'Travel' },
];

const REPEAT_OPTS: SegmentOption<Repeat>[] = [
  { key: 'None', label: 'None' },
  { key: 'Daily', label: 'Daily' },
  { key: 'Weekly', label: 'Weekly' },
  { key: 'Monthly', label: 'Monthly' },
  { key: 'Yearly', label: 'Yearly' },
];

// solo-mode: assignee restricted to ['me'] — initial 'me'
export default function NewReminder() {
  const gate = useFeatureGate('recurring');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewReminderInner />;
}

function NewReminderInner() {
  const { C } = useTheme();
  const { user, activeCouple, isSolo } = useSession();
  const { create } = useReminders();

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<Assignee>(isSolo ? 'me' : 'both');
  const [cat, setCat] = useState<CatKey>('General');
  const [repeat, setRepeat] = useState<Repeat>('None');
  const [due, setDue] = useState<Date>(() => {
    const d = new Date(Date.now() + 60 * 60000);
    d.setSeconds(0, 0);
    return d;
  });
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const catLabel = CATS.find((c) => c.key === cat)?.label ?? 'General';

  const onSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const assignedId =
      assignee === 'both'
        ? null
        : assignee === 'me'
          ? user?.id ?? null
          : activeCouple?.partner?.id ?? null;
    try {
      await create({
        title: title.trim(),
        description: null,
        due_at: due.toISOString(),
        priority: 2,
        category: catLabel,
        recurrence: repeat === 'None' ? null : repeat.toLowerCase(),
        assigned_to: assignedId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-reminder] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="NEW REMINDER"
      eyebrowColor={C.reminders}
      title="New reminder"
      footer={
        <PrimaryButton icon="check" onPress={onSave} disabled={!title.trim() || saving}>
          {saving ? 'Saving…' : 'Save reminder'}
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
            onChange={setDue}
            accent={C.reminders}
            open={dateOpen}
            onPress={() => {
              setDateOpen((v) => !v);
              setTimeOpen(false);
            }}
            minimumDate={new Date()}
          />
          <SheetTimeField
            pressTestID="new-reminder-time"
            value={due}
            onChange={setDue}
            accent={C.reminders}
            open={timeOpen}
            onPress={() => {
              setTimeOpen((v) => !v);
              setDateOpen(false);
            }}
          />
        </SheetRow>
      </SheetSection>

      <SheetSection title="Category">
        <SheetIconGrid
          options={CATS}
          selected={cat}
          onChange={setCat}
          accent={C.reminders}
          testIDPrefix="new-reminder-cat"
        />
      </SheetSection>

      <SheetSection title="Repeat">
        <SheetSegment
          options={REPEAT_OPTS}
          selected={repeat}
          onChange={setRepeat}
          accent={C.reminders}
          testIDPrefix="new-reminder-repeat"
        />
      </SheetSection>

      {assigneeOptions.length > 1 ? (
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
