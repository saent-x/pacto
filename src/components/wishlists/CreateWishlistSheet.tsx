import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { name: string }) => Promise<void>;
  wishlist?: { id: string; name: string };
}

export function CreateWishlistSheet({ sheetRef, onSave, wishlist }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [name, setName] = useState(wishlist?.name ?? '');
  const [saving, setSaving] = useState(false);
  const sessionKey = wishlist ? `edit:${wishlist.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!wishlist;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setName(wishlist?.name ?? '');
  }, [wishlist, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your list a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setName('');
      }
    } catch (error) {
      console.warn('[Coupl] Save wishlist failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [name, onSave, isEdit, sheetRef]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.wishlists }]}
    >
      <Feather name={isEdit ? 'check' : 'plus'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Create List'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      snapPoints={['72%']}
      footer={footer}
    >
      <Animated.View entering={FadeInDown.duration(300)} style={styles.form}>
        <View style={styles.header}>
          <Text style={[styles.sheetLabel, { color: C.wishlists }]}>
            {isEdit ? 'EDIT LIST' : 'NEW LIST'}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="Name your list..."
          placeholderTextColor={C.fog}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <View style={[styles.previewCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <Feather name="list" size={20} color={C.wishlists} />
          <Text style={[styles.previewText, { color: C.haze }]}>
            {name.trim() || 'Your new list will appear here'}
          </Text>
        </View>
      </Animated.View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
  },
  sheetLabel: {
    ...Typography.overline,
    letterSpacing: 3,
  },
  titleInput: {
    ...Typography.title,
    padding: 0,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.lg,
  },
  previewText: {
    ...Typography.body,
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: {
    ...Typography.subheading,
    fontSize: 15,
  },
});
