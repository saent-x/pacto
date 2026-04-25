import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useAllWishlistItems, useQuickAddWishItem } from '@/src/hooks/useWishlists';
import { useTheme } from '@/src/lib/theme';

const TAGS = ['HOME', 'TRAVEL', 'TREATS', 'BIG', 'KITCHEN', 'CLOTHES'];

export default function NewWish() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { C, F } = useTheme();
  const { add, update } = useQuickAddWishItem();
  const { items } = useAllWishlistItems();
  const existing = useMemo(
    () => (isEdit && id ? (items as any[]).find((i) => i.id === id) : undefined),
    [isEdit, id, items],
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [price, setPrice] = useState(
    existing?.price != null ? String(existing.price) : '',
  );
  const [tag, setTag] = useState(existing?.tag ?? 'HOME');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const priceNum = price ? Number(price) : null;
      const payload = {
        title: title.trim(),
        price: priceNum != null && !Number.isNaN(priceNum) ? priceNum : null,
        currency: 'EUR',
        tag: tag || null,
        url: url.trim() || null,
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await add(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn('[new-wish] save failed', err);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      eyebrow={isEdit ? 'EDIT WISH' : 'NEW WISH'}
      eyebrowColor={C.peach}
      title={isEdit ? 'Edit wish.' : 'Something for us.'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to wishlist'}
        </PrimaryButton>
      }
    >
      <Overline style={{ marginBottom: 8 }}>What</Overline>
      <TextInput
        testID="new-wish-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="Linen throw, oatmeal..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: title ? C.peach : C.line,
        }}
      />

      <View style={{ marginTop: 22, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 8 }}>Price</Overline>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 4,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: C.fog, fontFamily: F.bodyBold }}>€</Text>
            <TextInput
              testID="new-wish-price-input"
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={C.fog}
              inputMode="numeric"
              style={{
                flex: 1,
                color: C.bone,
                fontFamily: F.displayBold,
                fontSize: 18,
              }}
            />
          </View>
        </View>
        <View style={{ flex: 1.3 }}>
          <Overline style={{ marginBottom: 8 }}>Link</Overline>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Icon name="link" size={14} color={C.fog} />
            <TextInput
              testID="new-wish-url-input"
              value={url}
              onChangeText={setUrl}
              placeholder="paste url..."
              placeholderTextColor={C.fog}
              style={{
                flex: 1,
                color: C.bone,
                fontSize: 13,
                fontFamily: F.body,
              }}
            />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Tag</Overline>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {TAGS.map((t) => (
            <Pill
              key={t}
              testID={`new-wish-tag-${t}`}
              active={tag === t}
              activeBg={`${C.peach}33`}
              activeColor={C.peach}
              onPress={() => setTag(t)}
            >
              {t}
            </Pill>
          ))}
        </View>
      </View>
    </SheetShell>
  );
}
