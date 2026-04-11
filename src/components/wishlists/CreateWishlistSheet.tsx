import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { name: string }) => Promise<void>;
  wishlist?: { id: string; name: string };
}

export function CreateWishlistSheet({ sheetRef, onSave, wishlist }: Props) {
  const C = useColors();
  const { glassBg, glassBorder } = useGlass();

  const [name, setName] = useState(wishlist?.name ?? '');
  const [saving, setSaving] = useState(false);
  const sessionKey = wishlist ? `edit:${wishlist.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!wishlist;

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
      style={[sheet.saveBtn, { backgroundColor: C.wishlists }]}
    >
      <Feather name={isEdit ? 'check' : 'plus'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Create List'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      footer={footer}
    >
      <View style={sheet.form}>
        <View style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.wishlists }]}>
            {isEdit ? 'EDIT LIST' : 'NEW LIST'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
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
      </View>
    </ThemedSheet>
  );
}

const styles = StyleSheet.create({
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
});
