import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useTaskLists, type PastelKey } from '@/src/hooks/useTaskLists';

const ICONS: IconName[] = [
  'shoppingBag', 'home', 'heart', 'briefcase', 'book', 'gift', 'mapPin', 'coffee', 'music', 'camera',
];

const COLOR_KEYS: PastelKey[] = ['peach', 'lavender', 'butter', 'mint', 'rose', 'sky', 'gold', 'journal'];

export default function NewList() {
  const { C, F } = useTheme();
  const { create } = useTaskLists();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('shoppingBag');
  const [colorKey, setColorKey] = useState<PastelKey>('peach');
  const [saving, setSaving] = useState(false);

  const color = (C as any)[colorKey] as string;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await create({ name: trimmed, icon, colorKey });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-list] create failed', err);
      Alert.alert('Create failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow="NEW LIST"
      eyebrowColor={color}
      title="Make a list."
      footer={
        <PrimaryButton icon="plus" onPress={handleSave} disabled={!name.trim() || saving}>
          Create list
        </PrimaryButton>
      }
    >
      <Overline style={{ marginBottom: 8 }}>Name</Overline>
      <TextInput
        testID="new-list-name-input"
        value={name}
        onChangeText={setName}
        placeholder="Anniversary plans..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: name ? color : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Icon</Overline>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ICONS.map((i) => {
            const active = icon === i;
            return (
              <PressScale
                key={i}
                testID={`new-list-icon-${i}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setIcon(i);
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: active ? `${color}33` : C.card,
                  borderWidth: 1,
                  borderColor: active ? color : C.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={i} size={18} color={active ? color : C.mist} />
              </PressScale>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Color</Overline>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {COLOR_KEYS.map((ck) => (
            <PressScale
              key={ck}
              testID={`new-list-color-${ck}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                setColorKey(ck);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: (C as any)[ck],
                borderWidth: 3,
                borderColor: colorKey === ck ? 'rgba(255,255,255,0.3)' : 'transparent',
              }}
            />
          ))}
        </View>
      </View>
    </SheetShell>
  );
}
