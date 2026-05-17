import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { IconName } from '@/src/components/ui/Icon';
import {
  SheetIconLabelPicker,
  SheetSection,
  SheetShell,
  SheetTitleField,
  SheetToggleRow,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useJournal } from '@/src/hooks/useJournal';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';

// solo-mode: private toggle hidden — entries are always personal
export default function NewEntry() {
  const gate = useFeatureGate('journal');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewEntryInner />;
}

function NewEntryInner() {
  const { C, F } = useTheme();
  const { create } = useJournal();
  const { isSolo, partner } = useSession();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood>('good');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const partnerName = partner?.displayName ?? 'Partner';

  const now = useMemo(() => new Date(), []);
  const eyebrow = format(now, 'EEEE, MMMM d').toUpperCase();
  const entryDate = format(now, 'yyyy-MM-dd');

  const moods: IconLabelOption<Mood>[] = useMemo(
    () => [
      { key: 'great', icon: 'sun', label: 'Great', color: C.mint },
      { key: 'good', icon: 'cloud', label: 'Good', color: C.sky },
      { key: 'okay', icon: 'minus', label: 'Okay', color: C.butter },
      { key: 'low', icon: 'drizzle', label: 'Low', color: C.rose },
      { key: 'rough', icon: 'zap', label: 'Rough', color: C.peach },
    ],
    [C],
  );
  const active = moods.find((m) => m.key === mood)!;

  const canSave = body.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await create({
        title: title.trim() || null,
        body: body.trim(),
        mood,
        is_private: isSolo ? false : isPrivate,
        entry_date: entryDate,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-entry] create failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={eyebrow}
      eyebrowColor={active.color}
      title="New entry"
      footer={
        <PrimaryButton icon="feather" onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save entry'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Title" first>
        <SheetTitleField
          testID="new-entry-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="Give it a title…"
          accent={active.color}
        />
      </SheetSection>

      <SheetSection title="Entry">
        <TextInput
          testID="new-entry-body-input"
          value={body}
          onChangeText={setBody}
          placeholder="Write your thoughts…"
          placeholderTextColor={C.fog}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 200,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.lineColor,
            borderRadius: 14,
            padding: 14,
            color: C.inkColor,
            fontFamily: F.serif,
            fontStyle: body ? 'normal' : 'italic',
            fontSize: 16,
            lineHeight: 24,
          }}
        />
      </SheetSection>

      <SheetSection title="How does it feel?">
        <SheetIconLabelPicker
          options={moods}
          selected={mood}
          onChange={setMood}
          testIDPrefix="new-entry-mood"
        />
      </SheetSection>

      {!isSolo && (
        <View style={{ marginTop: 22 }}>
          <SheetToggleRow
            icon="lock"
            label="Private"
            sublabel={isPrivate ? 'Only you can see this entry' : `${partnerName} can see this entry`}
            value={isPrivate}
            onChange={setIsPrivate}
            accent={C.lavender}
            pressTestID="new-entry-private-toggle"
          />
        </View>
      )}
    </SheetShell>
  );
}
