import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import {
  SheetIconLabelPicker,
  SheetSection,
  SheetShell,
  type IconLabelOption,
} from '@/src/components/ui/SheetShell';
import { useLoveNotes, type LoveNoteVibe } from '@/src/hooks/useLoveNotes';
import { useTheme } from '@/src/lib/theme';

export default function NewNote() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { create, update, notes } = useLoveNotes();
  const existing = useMemo(
    () => (isEdit && id ? notes.find((n) => n.id === id) : undefined),
    [isEdit, id, notes],
  );
  const [body, setBody] = useState(existing?.body ?? '');
  const [vibe, setVibe] = useState<LoveNoteVibe>((existing?.vibe as LoveNoteVibe) ?? 'sweet');
  const [saving, setSaving] = useState(false);

  const vibes: IconLabelOption<LoveNoteVibe>[] = useMemo(
    () => [
      { key: 'sweet', icon: 'heart', label: 'Sweet', color: C.rose },
      { key: 'funny', icon: 'star', label: 'Funny', color: C.butter },
      { key: 'thank', icon: 'gift', label: 'Thanks', color: C.mint },
      { key: 'sorry', icon: 'cloud', label: 'Sorry', color: C.sky },
      { key: 'proud', icon: 'flag', label: 'Proud', color: C.peach },
    ],
    [C],
  );
  const active = vibes.find((v) => v.key === vibe)!;

  const onSave = async () => {
    const trimmed = body.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (isEdit && id) {
        await update(id, { body: trimmed, vibe });
      } else {
        await create({ body: trimmed, vibe });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-note] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT NOTE' : 'NEW LOVE NOTE'}
      eyebrowColor={active.color}
      title={isEdit ? 'Edit note.' : 'Tell them.'}
      footer={
        <PrimaryButton
          icon={isEdit ? 'check' : 'heart'}
          onPress={onSave}
          disabled={!body.trim() || saving}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Send note'}
        </PrimaryButton>
      }
    >
      <SheetSection title="Note" first>
        <View
          style={{
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 18,
            padding: 18,
          }}
        >
          <View style={{ position: 'absolute', top: 14, right: 16, opacity: 0.4 }}>
            <Icon name={active.icon} size={18} color={active.color} />
          </View>
          <TextInput
            testID="new-note-body-input"
            value={body}
            onChangeText={setBody}
            placeholder="Say the thing you've been meaning to say..."
            placeholderTextColor={C.fog}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 140,
              color: C.bone,
              fontFamily: F.serif,
              fontStyle: body ? 'normal' : 'italic',
              fontSize: 17,
              lineHeight: 27,
            }}
          />
        </View>
      </SheetSection>

      <SheetSection title="Vibe">
        <SheetIconLabelPicker
          options={vibes}
          selected={vibe}
          onChange={setVibe}
          testIDPrefix="new-note-vibe"
        />
      </SheetSection>
    </SheetShell>
  );
}
