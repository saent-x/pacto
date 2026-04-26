import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import {
  SheetIconLabelPicker,
  SheetInfoCard,
  SheetSection,
  SheetShell,
  SheetTitleField,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useCheckIns } from '@/src/hooks/useCheckIns';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type MoodKey = '1' | '2' | '3' | '4' | '5';

type Mood = {
  key: MoodKey;
  icon: IconName;
  color: string;
  label: string;
  vibe: string;
};

// solo-mode: partner-aware info card hidden
export default function NewCheckin() {
  const { C } = useTheme();
  const { createOrUpdate, isSubmitting } = useCheckIns();
  const { isSolo, partner } = useSession();
  const [mood, setMood] = useState<MoodKey>('4');
  const [one, setOne] = useState('');
  const [saving, setSaving] = useState(false);
  const partnerName = partner?.displayName ?? 'Sofia';

  const moods: Mood[] = useMemo(
    () => [
      { key: '1', icon: 'cloudRain', color: C.sky, label: 'Rough', vibe: 'rough' },
      { key: '2', icon: 'drizzle', color: C.lavender, label: 'Low', vibe: 'low' },
      { key: '3', icon: 'minus', color: C.butter, label: 'Okay', vibe: 'okay' },
      { key: '4', icon: 'cloud', color: C.mint, label: 'Good', vibe: 'good' },
      { key: '5', icon: 'sun', color: C.peach, label: 'Great', vibe: 'great' },
    ],
    [C],
  );
  const active = moods.find((m) => m.key === mood)!;
  const moodOptions: IconLabelOption<MoodKey>[] = moods.map((m) => ({
    key: m.key,
    icon: m.icon,
    label: m.label,
    color: m.color,
  }));
  const busy = saving || isSubmitting;

  const onSave = async () => {
    if (busy) return;
    setSaving(true);
    try {
      await createOrUpdate({
        mood: active.vibe,
        note: one.trim() || null,
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
        />
      </SheetSection>

      <SheetSection title="One thing">
        <SheetTitleField
          testID="new-checkin-note-input"
          value={one}
          onChangeText={setOne}
          placeholder="that made today what it was..."
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
