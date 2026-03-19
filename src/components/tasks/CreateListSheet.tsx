import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { Button } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const ICONS = [
  'shopping-cart', 'home', 'heart', 'briefcase', 'book',
  'gift', 'map-pin', 'coffee', 'music', 'camera',
] as const;

const COLORS = [
  '#7BA08A', '#9B8EC4', '#C4977A', '#D4A054',
  '#7BA0AF', '#B08090', '#8AAF7B', '#C96B5A',
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { name: string; icon: string; color: string }) => Promise<void>;
}

export function CreateListSheet({ sheetRef, onSave }: Props) {
  const C = useColors();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('shopping-cart');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your list a name.');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSave({ name: name.trim(), icon, color });
    setSaving(false);
    sheetRef.current?.dismiss();
    setName('');
    setIcon('shopping-cart');
    setColor(COLORS[0]);
  }, [name, icon, color, onSave]);

  return (
    <ThemedSheet sheetRef={sheetRef} snapPoints={['60%']} title="New List">
      <View style={styles.form}>
        <BottomSheetTextInput
          style={[styles.nameInput, { color: C.text, borderBottomColor: C.dusk }]}
          placeholder="List name"
          placeholderTextColor={C.fog}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Icon picker */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Icon</Text>
          <View style={styles.iconRow}>
            {ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                style={[
                  styles.iconCircle,
                  { borderColor: icon === ic ? color : C.dusk },
                  icon === ic && { backgroundColor: color + '20' },
                ]}
                onPress={() => setIcon(ic)}
              >
                <Feather name={ic} size={18} color={icon === ic ? color : C.haze} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.fog }]}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSelected,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        <Button
          title="Create List"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveBtn}
        />
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing['2xl'] },
  nameInput: {
    ...Typography.heading,
    borderBottomWidth: 1,
    paddingBottom: Spacing.md,
  },
  field: { gap: Spacing.md },
  label: { ...Typography.overline },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  saveBtn: { marginTop: Spacing.md },
});
