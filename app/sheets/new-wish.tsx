import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { FeatureUnavailable } from '@/src/components/features/FeatureUnavailable';
import { PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import {
  SheetIconGrid,
  SheetRow,
  SheetSection,
  SheetSegment,
  SheetShell,
  SheetTitleField,
  type IconOption,
} from '@/src/components/ui/SheetShell';
import {
  useAllWishlistItems,
  useQuickAddWishItem,
  type WishScope,
} from '@/src/hooks/useWishlists';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useTheme } from '@/src/lib/theme';

type Tag = 'HOME' | 'TRAVEL' | 'TREATS' | 'BIG' | 'KITCHEN' | 'CLOTHES';

const TAGS: IconOption<Tag>[] = [
  { key: 'HOME', icon: 'home' },
  { key: 'TRAVEL', icon: 'mapPin' },
  { key: 'TREATS', icon: 'gift' },
  { key: 'BIG', icon: 'star' },
  { key: 'KITCHEN', icon: 'coffee' },
  { key: 'CLOTHES', icon: 'shoppingBag' },
];

const SCOPES: { key: WishScope; label: string }[] = [
  { key: 'mine', label: 'Mine' },
  { key: 'partner', label: 'Theirs' },
  { key: 'shared', label: 'Shared' },
];

export default function NewWish() {
  const gate = useFeatureGate('wishlist');
  if (!gate.enabled) return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  return <NewWishInner />;
}

function NewWishInner() {
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
  const [tag, setTag] = useState<Tag>((existing?.tag as Tag) ?? 'HOME');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [scope, setScope] = useState<WishScope>((existing?.scope as WishScope) ?? 'mine');
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
        scope,
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
      title={isEdit ? 'Edit wish' : 'New wish'}
      footer={
        <PrimaryButton icon={isEdit ? 'check' : 'plus'} onPress={onSave} disabled={!canSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to wishlist'}
        </PrimaryButton>
      }
    >
      <SheetSection title="What" first>
        <SheetTitleField
          testID="new-wish-title-input"
          value={title}
          onChangeText={setTitle}
          placeholder="What's on your wishlist…"
          accent={C.peach}
        />
      </SheetSection>

      <SheetRow style={{ marginTop: 22 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: F.bodyBold,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: C.fog,
              marginBottom: 10,
            }}
          >
            Price
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 4,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
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
          <Text
            style={{
              fontFamily: F.bodyBold,
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: C.fog,
              marginBottom: 10,
            }}
          >
            Link
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Icon name="link" size={14} color={C.fog} />
            <TextInput
              testID="new-wish-url-input"
              value={url}
              onChangeText={setUrl}
              placeholder="Paste a link…"
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
      </SheetRow>

      <SheetSection title="Tag">
        <SheetIconGrid
          options={TAGS}
          selected={tag}
          onChange={setTag}
          accent={C.peach}
          testIDPrefix="new-wish-tag"
        />
      </SheetSection>

      <SheetSection title="For">
        <SheetSegment
          options={SCOPES}
          selected={scope}
          onChange={setScope}
          accent={C.peach}
          testIDPrefix="new-wish-scope"
        />
      </SheetSection>
    </SheetShell>
  );
}
