import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

type Vibe = 'sweet' | 'funny' | 'thank' | 'sorry' | 'proud';

export default function NewNote() {
  const { C, F } = useTheme();
  const [body, setBody] = useState('');
  const [to] = useState<'sofia' | 'mattia'>('sofia');
  const [vibe, setVibe] = useState<Vibe>('sweet');

  const vibes: { k: Vibe; label: string; icon: IconName; color: string }[] = useMemo(
    () => [
      { k: 'sweet', label: 'Sweet', icon: 'heart', color: C.rose },
      { k: 'funny', label: 'Funny', icon: 'star', color: C.butter },
      { k: 'thank', label: 'Thanks', icon: 'gift', color: C.mint },
      { k: 'sorry', label: 'Sorry', icon: 'cloud', color: C.sky },
      { k: 'proud', label: 'Proud', icon: 'flag', color: C.peach },
    ],
    [C]
  );
  const active = vibes.find((v) => v.k === vibe)!;

  return (
    <SheetShell
      eyebrow="NEW LOVE NOTE"
      eyebrowColor={active.color}
      title="Tell them."
      footer={<PrimaryButton icon="heart" onPress={() => router.back()}>Send note</PrimaryButton>}
    >
      <View
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 18,
          padding: 18,
        }}
      >
        <View style={{ position: 'absolute', top: 14, right: 16, opacity: 0.4 }}>
          <Icon name={active.icon} size={18} color={active.color} />
        </View>
        <Overline color={C.fog}>For {to === 'sofia' ? 'Sofia' : 'Mattia'}</Overline>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Say the thing you've been meaning to say..."
          placeholderTextColor={C.fog}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 140,
            marginTop: 10,
            color: C.bone,
            fontFamily: F.serif,
            fontStyle: body ? 'normal' : 'italic',
            fontSize: 17,
            lineHeight: 27,
          }}
        />
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Vibe</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {vibes.map((v) => {
              const sel = vibe === v.k;
              return (
                <Pressable
                  key={v.k}
                  onPress={() => setVibe(v.k)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: sel ? `${v.color}26` : 'transparent',
                    borderWidth: 1,
                    borderColor: sel ? v.color : C.line,
                  }}
                >
                  <Icon name={v.icon} size={14} color={sel ? v.color : C.fog} />
                  <Text
                    style={{
                      color: sel ? v.color : C.mist,
                      fontFamily: F.bodyBold,
                      fontSize: 12,
                    }}
                  >
                    {v.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SheetShell>
  );
}
