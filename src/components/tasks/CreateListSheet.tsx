import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
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
  const { mode } = useTheme();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('shopping-cart');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your list a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), icon, color });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      setName('');
      setIcon('shopping-cart');
      setColor(COLORS[0]);
    } catch (error) {
      console.warn('[Coupl] Save list failed:', error);
      Alert.alert('Create failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [name, icon, color, onSave]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.tasks }]}
    >
      <Feather name="plus" size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Creating...' : 'Create List'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet sheetRef={sheetRef} snapPoints={['72%']} scrollable footer={footer}>
      <View style={styles.form}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sheetLabel, { color: C.tasks }]}>NEW LIST</Text>
          <Text style={[styles.dateDisplay, { color: C.primary }]}>Shape your shared workflow</Text>
        </View>

        <BottomSheetTextInput
          style={[styles.nameInput, { color: C.text }]}
          placeholder="List name"
          placeholderTextColor={C.fog}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICONS.map((ic) => {
              const active = icon === ic;
              return (
                <TouchableOpacity
                  key={ic}
                  style={[
                    styles.iconBtn,
                    { borderColor: active ? color : glassBorder },
                    active ? styles.iconBtnActive : undefined,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIcon(ic);
                  }}
                >
                  <Feather name={ic} size={20} color={active ? color : C.haze} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => {
              const active = color === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    active && styles.colorActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColor(c);
                  }}
                >
                  {active && <Feather name="check" size={14} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  dateHeader: { gap: Spacing.xs },
  sheetLabel: { ...Typography.overline, letterSpacing: 3 },
  dateDisplay: { ...Typography.overline, letterSpacing: 1.5 },
  nameInput: { ...Typography.title, padding: 0 },
  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.overline, letterSpacing: 2 },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorActive: {
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { ...Typography.subheading, fontSize: 15 },
});
