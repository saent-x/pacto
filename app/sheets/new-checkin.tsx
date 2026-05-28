import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import {
  SheetIconLabelPicker,
  SheetInfoCard,
  SheetSection,
  SheetShell,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import {
  CHECK_IN_STATES,
  type CheckInStateId,
} from '@/src/constants/checkInStates';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';

type Visibility = 'personal' | 'shared';

// solo-mode: partner-aware info card hidden
export default function NewCheckin() {
  const gate = useFeatureGate('checkins');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewCheckinInner />;
}

function NewCheckinInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { createOrUpdate, update, checkIns, isLoading, isSubmitting } = useCheckIns();
  const { isSolo, partner, user } = useSession();
  const { C } = useTheme();
  const existing = useMemo(
    () => (id ? checkIns.find((checkIn) => checkIn.id === id) : null),
    [checkIns, id],
  );
  const canEditCheckIn = !isEdit || Boolean(existing && user?.id && existing.authorId === user.id);
  const [mood, setMood] = useState<CheckInStateId>(() => normalizeMood(existing?.mood));
  const [visibility, setVisibility] = useState<Visibility>(
    () => (existing?.isPrivate || isSolo ? 'personal' : 'shared'),
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const partnerName = partner?.displayName ?? 'Partner';

  const active = CHECK_IN_STATES.find((state) => state.id === mood)!;
  const moodOptions: IconLabelOption<CheckInStateId>[] = useMemo(() => CHECK_IN_STATES.map((m) => ({
    key: m.id,
    icon: m.icon,
    label: m.label,
    color: m.color,
  })), []);
  const visibilityOptions = useMemo<IconLabelOption<Visibility>[]>(
    () => [
      { key: 'personal', icon: 'lock', label: 'Just me', color: C.sky },
      { key: 'shared', icon: 'users', label: 'Together', color: C.gold },
    ],
    [C.gold, C.sky],
  );
  const busy = saving || isSubmitting;
  const canSave = !busy && canEditCheckIn;

  useEffect(() => {
    if (!existing || !canEditCheckIn) return;
    setMood(normalizeMood(existing.mood));
    setVisibility(existing.isPrivate || isSolo ? 'personal' : 'shared');
  }, [canEditCheckIn, existing, isSolo]);

  const onSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const isPrivate = isSolo ? true : visibility === 'personal';
      if (isEdit && existing) {
        await update(existing.id, {
          mood: active.id,
          note: null,
          isPrivate,
          ...(isValidDateKey(existing.checkInDate) ? { checkInDate: existing.checkInDate } : {}),
        });
      } else {
        await createOrUpdate({
          mood: active.id,
          note: null,
          isPrivate,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-checkin] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const checkInUnavailableTitle = isLoading
    ? 'Loading check-in'
    : existing
    ? 'Check-in not editable'
    : 'Check-in missing';
  const checkInUnavailableBody = isLoading
    ? 'Loading this check-in…'
    : existing
    ? 'Only the author can edit this check-in.'
    : 'This check-in could not be found.';

  if (isEdit && (!existing || !canEditCheckIn)) {
    return (
      <SheetShell eyebrow="CHECK-IN" title={checkInUnavailableTitle}>
        <Text style={[Typography.body, { color: C.ink2 }]}>
          {checkInUnavailableBody}
        </Text>
      </SheetShell>
    );
  }

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT CHECK-IN' : 'DAILY CHECK-IN'}
      eyebrowColor={active.color}
      title={isEdit ? 'Edit check-in' : 'How are you?'}
      footer={
        <PrimaryButton icon="check" onPress={onSave} disabled={!canSave}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Log today'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Mood" first>
        <SheetIconLabelPicker
          options={moodOptions}
          selected={mood}
          onChange={setMood}
          testIDPrefix="new-checkin-mood"
        />
      </SheetSection>

      <SheetSection title="Selected mood">
        <View
          testID="new-checkin-selected-mood"
          style={[
            styles.selectedMood,
            {
              backgroundColor: alphaColor(active.color, 0.18),
              borderColor: C.inkColor,
            },
          ]}
        >
          <View style={[styles.selectedMoodIcon, { backgroundColor: active.color }]}>
            <Icon name={active.icon} size={18} color={C.inkColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>TODAY FEELS</Text>
            <Text style={[styles.selectedMoodLabel, { color: C.inkColor }]}>
              {active.label}
            </Text>
          </View>
        </View>
      </SheetSection>

      {!isSolo ? (
        <SheetSection title="Visibility">
          <SheetIconLabelPicker
            options={visibilityOptions}
            selected={visibility}
            onChange={setVisibility}
            testIDPrefix="new-checkin-visibility"
          />
          <SheetInfoCard icon="eye">
            {visibility === 'personal'
              ? 'Only you can see this check-in.'
              : `${partnerName} will see your selected mood.`}
          </SheetInfoCard>
        </SheetSection>
      ) : null}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  selectedMood: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedMoodIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMoodLabel: {
    fontFamily: Typography.pixelFont,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 0,
    marginTop: 2,
  },
});

function normalizeMood(value: unknown): CheckInStateId {
  return CHECK_IN_STATES.some((state) => state.id === value)
    ? (value as CheckInStateId)
    : 'okay';
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
