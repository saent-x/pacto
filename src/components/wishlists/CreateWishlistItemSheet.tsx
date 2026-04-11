import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';

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
  const { glassBg, glassBorder } = useGlass();

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : '');
  const [priority, setPriority] = useState(item?.priority ?? 0);
  const [saving, setSaving] = useState(false);
  const sessionKey = item ? `edit:${item.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!item;

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
      style={[sheet.saveBtn, { backgroundColor: C.wishlists }]}
    >
      <Feather name={isEdit ? 'check' : 'plus'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Drop a Hint'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet sheetRef={sheetRef} scrollable footer={footer}>
      <View style={sheet.form}>
        <View style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.wishlists }]}>
            {isEdit ? 'EDIT ITEM' : 'DROP A HINT'}
          </Text>
          <Text style={[sheet.dateDisplay, { color: C.primary }]}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
        </View>

        <BottomSheetTextInput
          style={[sheet.titleInput, { color: C.text }]}
          placeholder="What do you wish for?"
          placeholderTextColor={C.fog}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={[sheet.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[sheet.bodyInput, { color: C.text }]}
            placeholder="Add a note..."
            placeholderTextColor={C.fog}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Link</Text>
          <View style={[sheet.inputCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Feather name="link" size={15} color={C.fog} />
            <BottomSheetTextInput
              style={[sheet.fieldInput, { color: C.text }]}
              placeholder="https://..."
              placeholderTextColor={C.fog}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Price</Text>
          <View style={[sheet.inputCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[sheet.currencySymbol, { color: C.fog }]}>$</Text>
            <BottomSheetTextInput
              style={[sheet.fieldInput, { color: C.text }]}
              placeholder="0.00"
              placeholderTextColor={C.fog}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Priority</Text>
          <View style={sheet.toggleRow}>
            {PRIORITIES.map((p) => {
              const active = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    sheet.glassToggle,
                    { backgroundColor: active ? activeBg : glassBg, borderColor: active ? C.wishlists : glassBorder },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(priority === p.value ? 0 : p.value);
                  }}
                >
                  <Feather name={p.icon} size={14} color={active ? C.wishlists : C.fog} />
                  <Text style={[sheet.toggleText, { color: active ? C.wishlists : C.haze }]}>
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
