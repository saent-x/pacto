import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

const ICONS: IconName[] = [
  'shoppingBag',
  'home',
  'heart',
  'briefcase',
  'book',
  'gift',
  'mapPin',
  'coffee',
  'music',
  'camera',
];

export default function NewList() {
  const { C, F } = useTheme();
  const colors = [C.peach, C.lavender, C.butter, C.mint, C.rose, C.sky, C.gold, C.journal];
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('shoppingBag');
  const [color, setColor] = useState<string>(C.peach);

  return (
    <SheetShell
      eyebrow="NEW LIST"
      eyebrowColor={color}
      title="Make a list."
      footer={<PrimaryButton icon="plus" onPress={() => router.back()}>Create list</PrimaryButton>}
    >
      <Overline style={{ marginBottom: 8 }}>Name</Overline>
      <TextInput
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
              <Pressable
                key={i}
                onPress={() => setIcon(i)}
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
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Color</Overline>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {colors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: color === c ? 'rgba(255,255,255,0.3)' : 'transparent',
              }}
            />
          ))}
        </View>
      </View>
    </SheetShell>
  );
}
