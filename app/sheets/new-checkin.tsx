import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import {
  SheetIconLabelPicker,
  SheetInfoCard,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
  type SegmentOption,
} from '@/src/components/ui/SheetShell';
import {
  CHECK_IN_STATES,
  type CheckInStateId,
} from '@/src/constants/checkInStates';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';

// solo-mode: partner-aware info card hidden
export default function NewCheckin() {
  const gate = useFeatureGate('checkins');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewCheckinInner />;
}

function NewCheckinInner() {
  const { createOrUpdate, isSubmitting } = useCheckIns();
  const { isSolo, partner } = useSession();
  const [mood, setMood] = useState<CheckInStateId>('soft');
  const [energy, setEnergy] = useState('3');
  const [one, setOne] = useState('');
  const [saving, setSaving] = useState(false);
  const partnerName = partner?.displayName ?? 'Partner';

  const active = CHECK_IN_STATES.find((state) => state.id === mood)!;
  const moodOptions: IconLabelOption<CheckInStateId>[] = useMemo(() => CHECK_IN_STATES.map((m) => ({
    key: m.id,
    icon: m.icon,
    image: m.image,
    label: m.label,
    color: m.color,
  })), []);
  const energyOptions: SegmentOption[] = useMemo(() => [1, 2, 3, 4, 5].map((level) => ({
    key: String(level),
    label: String(level),
  })), []);
  const busy = saving || isSubmitting;

  const onSave = async () => {
    if (busy) return;
    setSaving(true);
    try {
      await createOrUpdate({
        mood: active.id,
        note: one.trim() || null,
        energy: Number(energy),
        isPrivate: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-checkin] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="DAILY CHECK-IN"
      eyebrowColor={active.color}
      title="How are you?"
      footer={
        <PrimaryButton icon="check" onPress={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Log today'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Mood" first>
        <SheetIconLabelPicker
          options={moodOptions}
          selected={mood}
          onChange={setMood}
          testIDPrefix="new-checkin-mood"
          iconOnly
        />
      </SheetSection>

      <SheetSection title="Energy">
        <SheetSegment
          options={energyOptions}
          selected={energy}
          onChange={setEnergy}
          accent={active.color}
          testIDPrefix="new-checkin-energy"
        />
      </SheetSection>

      <SheetSection title="One thing">
        <SheetTitleField
          testID="new-checkin-note-input"
          value={one}
          onChangeText={setOne}
          placeholder="What stood out today…"
          accent={active.color}
        />
      </SheetSection>

      {!isSolo && (
        <SheetSection title="Privacy">
          <SheetInfoCard icon="eye">
            {partnerName} will see your mood — not the one-thing, unless you tap to share.
          </SheetInfoCard>
        </SheetSection>
      )}
    </SheetShell>
  );
}
