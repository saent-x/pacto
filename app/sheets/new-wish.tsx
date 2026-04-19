import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

const TAGS = ['HOME', 'TRAVEL', 'TREATS', 'BIG', 'KITCHEN', 'CLOTHES'];

export default function NewWish() {
  const { C, F } = useTheme();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [tag, setTag] = useState('HOME');
  const [url, setUrl] = useState('');

  return (
    <SheetShell
      eyebrow="NEW WISH"
      eyebrowColor={C.peach}
      title="Something for us."
      footer={<PrimaryButton icon="plus" onPress={() => router.back()}>Add to wishlist</PrimaryButton>}
    >
      <Overline style={{ marginBottom: 8 }}>What</Overline>
      <TextInput
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
