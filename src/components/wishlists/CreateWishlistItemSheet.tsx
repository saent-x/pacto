import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';

const PRIORITIES = [
  { value: 1, label: 'Low', icon: 'minus' as const },
  { value: 2, label: 'Med', icon: 'alert-circle' as const },
  { value: 3, label: 'High', icon: 'alert-triangle' as const },
];

interface WishlistItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  price: number | null;
  priority: number;
}

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { title: string; description: string | null; url: string | null; price: number | null; priority: number }) => Promise<void>;
  item?: WishlistItem;
}

export function CreateWishlistItemSheet({ sheetRef, onSave, item }: Props) {
  const C = useColors();
  const { mode } = useTheme();

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : '');
  const [priority, setPriority] = useState(item?.priority ?? 0);
  const [saving, setSaving] = useState(false);
  const sessionKey = item ? `edit:${item.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!item;

  const glassBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const glassBorder = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const activeBg = C.wishlistsLight;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;
    setTitle(item?.title ?? '');
    setDescription(item?.description ?? '');
    setUrl(item?.url ?? '');
    setPrice(item?.price != null ? String(item.price) : '');
    setPriority(item?.priority ?? 0);
  }, [item, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your item a name.');
      return;
    }
    const parsedPrice = price.trim().length > 0 ? Number.parseFloat(price) : null;
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      Alert.alert('Price invalid', 'Enter a valid amount or leave the price blank.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        price: parsedPrice,
        priority,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setTitle('');
        setDescription('');
        setUrl('');
        setPrice('');
        setPriority(0);
      }
    } catch (error) {
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, url, price, priority, onSave, isEdit, sheetRef]);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[styles.saveBtn, { backgroundColor: C.wishlists }]}
    >
      <Feather name={isEdit ? 'check' : 'plus'} size={18} color={C.ink} />
      <Text style={[styles.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Drop a Hint'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet sheetRef={sheetRef} snapPoints={['84%']} scrollable footer={footer}>
      <View style={styles.form}>
        <Text style={[styles.sheetLabel, { color: C.wishlists }]}>
          {isEdit ? 'EDIT ITEM' : 'DROP A HINT'}
        </Text>

        <BottomSheetTextInput
          style={[styles.titleInput, { color: C.text }]}
          placeholder="What do you wish for?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={[styles.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[styles.bodyInput, { color: C.text }]}
            placeholder="Add a note..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Link</Text>
          <View style={[styles.inputCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Feather name="link" size={15} color={C.fog} />
            <BottomSheetTextInput
              style={[styles.linkInput, { color: C.text }]}
              placeholder="https://..."
              placeholderTextColor={C.fog}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Price</Text>
          <View style={[styles.inputCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.currencySymbol, { color: C.fog }]}>$</Text>
            <BottomSheetTextInput
              style={[styles.linkInput, { color: C.text }]}
              placeholder="0.00"
              placeholderTextColor={C.fog}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <View style={styles.toggleRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.wishlists : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.wishlists : C.fog} />
                  <Text style={[styles.toggleText, { color: active ? C.wishlists : C.haze }]}>
                    {p.label}
                  </Text>
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
  form: { gap: Spacing.xl },
  sheetLabel: { ...Typography.overline, letterSpacing: 3 },
  titleInput: { ...Typography.title, padding: 0 },
  bodyCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: Spacing.md },
  bodyInput: { ...Typography.body, minHeight: 72, lineHeight: 22, textAlignVertical: 'top', padding: 0 },
  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.overline, letterSpacing: 2 },
  inputCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  linkInput: { ...Typography.body, flex: 1, padding: 0 },
  currencySymbol: { ...Typography.heading },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  glassToggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: { ...Typography.captionMedium, fontSize: 13 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 16, borderRadius: 14,
  },
  saveBtnText: { ...Typography.subheading, fontSize: 15 },
});
