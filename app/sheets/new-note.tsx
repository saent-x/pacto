import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
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

  const vibes: { k: LoveNoteVibe; label: string; icon: IconName; color: string }[] = useMemo(
    () => [
      { k: 'sweet', label: 'Sweet', icon: 'heart', color: C.rose },
      { k: 'funny', label: 'Funny', icon: 'star', color: C.butter },
      { k: 'thank', label: 'Thanks', icon: 'gift', color: C.mint },
      { k: 'sorry', label: 'Sorry', icon: 'cloud', color: C.sky },
      { k: 'proud', label: 'Proud', icon: 'flag', color: C.peach },
    ],
    [C]
  );
  const active = vibes.find((v) => v.k === vibe)!;

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

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Vibe</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {vibes.map((v) => {
              const sel = vibe === v.k;
              return (
                <PressScale
                  key={v.k}
                  testID={`new-note-vibe-${v.k}`}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setVibe(v.k);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: sel ? `${v.color}26` : 'transparent',
                    borderWidth: 1,
                    borderColor: sel ? v.color : C.line,
                  }}
                >
                  <Icon name={v.icon} size={14} color={sel ? v.color : C.fog} />
                  <Text
                    style={{
                      color: sel ? v.color : C.mist,
                      fontFamily: F.bodyBold,
                      fontSize: 12,
                    }}
                  >
                    {v.label}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SheetShell>
  );
}
