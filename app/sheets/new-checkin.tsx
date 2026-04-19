import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

export default function NewCheckin() {
  const { C, F } = useTheme();
  const [mood, setMood] = useState(4);
  const [one, setOne] = useState('');

  const moods: { n: number; icon: IconName; color: string; label: string }[] = [
    { n: 1, icon: 'cloudRain', color: C.sky, label: 'Rough' },
    { n: 2, icon: 'drizzle', color: C.lavender, label: 'Low' },
    { n: 3, icon: 'minus', color: C.butter, label: 'Okay' },
    { n: 4, icon: 'cloud', color: C.mint, label: 'Good' },
    { n: 5, icon: 'sun', color: C.peach, label: 'Great' },
  ];
  const active = moods.find((m) => m.n === mood)!;

  return (
    <SheetShell
      eyebrow="DAILY CHECK-IN"
      eyebrowColor={active.color}
      title="How are you?"
      footer={<PrimaryButton icon="check" onPress={() => router.back()}>Log today</PrimaryButton>}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
        {moods.map((m) => {
          const sel = mood === m.n;
          return (
            <Pressable
              key={m.n}
              onPress={() => setMood(m.n)}
              style={{
                flex: 1,
                paddingVertical: 16,
                paddingHorizontal: 6,
                borderRadius: 18,
                backgroundColor: sel ? `${m.color}33` : C.card,
                borderWidth: 1,
                borderColor: sel ? m.color : C.line,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: sel ? m.color : 'transparent',
                  borderWidth: sel ? 0 : 1,
                  borderColor: C.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={m.icon} size={18} color={sel ? C.ink : C.mist} />
              </View>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: sel ? m.color : C.fog,
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 8 }}>One thing</Overline>
        <TextInput
          value={one}
          onChangeText={setOne}
          placeholder="that made today what it was..."
          placeholderTextColor={C.fog}
          style={{
            color: C.bone,
            fontFamily: F.displayBold,
            fontSize: 20,
            paddingVertical: 6,
            borderBottomWidth: 2,
            borderBottomColor: one ? active.color : C.line,
          }}
        />
      </View>

      <View
        style={{
          marginTop: 20,
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Icon name="eye" size={16} color={C.fog} />
        <Text style={{ flex: 1, fontSize: 12, color: C.mist, lineHeight: 17 }}>
          Sofia will see your mood — not the one-thing, unless you tap to share.
        </Text>
      </View>
    </SheetShell>
  );
}
