import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';

export default function NewEntry() {
  const { C, F } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood>('good');
  const [isPrivate, setIsPrivate] = useState(false);

  const moods: { k: Mood; icon: IconName; color: string; label: string }[] = [
    { k: 'great', icon: 'sun', color: C.mint, label: 'Great' },
    { k: 'good', icon: 'cloud', color: C.sky, label: 'Good' },
    { k: 'okay', icon: 'minus', color: C.butter, label: 'Okay' },
    { k: 'low', icon: 'drizzle', color: C.rose, label: 'Low' },
    { k: 'rough', icon: 'zap', color: C.peach, label: 'Rough' },
  ];

  return (
    <SheetShell
      eyebrow="SATURDAY, APRIL 18"
      title="New entry."
      footer={<PrimaryButton icon="feather" onPress={() => router.back()}>Save entry</PrimaryButton>}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Give it a title…"
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 26,
          paddingVertical: 6,
          letterSpacing: -0.5,
        }}
      />
      <View style={{ marginTop: 4, width: 40, height: 2, backgroundColor: C.gold, borderRadius: 1 }} />

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write your thoughts..."
        placeholderTextColor={C.fog}
        multiline
        textAlignVertical="top"
        style={{
          minHeight: 200,
          marginTop: 18,
          color: C.bone,
          fontFamily: F.serif,
          fontStyle: body ? 'normal' : 'italic',
          fontSize: 16,
          lineHeight: 24,
        }}
      />

      <View style={{ marginTop: 14 }}>
        <Overline style={{ marginBottom: 10 }}>How does it feel?</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {moods.map((m) => {
              const active = mood === m.k;
              return (
                <Pressable
                  key={m.k}
                  onPress={() => setMood(m.k)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: active ? `${m.color}26` : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? m.color : C.line,
                  }}
                >
                  <Icon name={m.icon} size={14} color={active ? m.color : C.fog} />
                  <Text
                    style={{
                      color: active ? m.color : C.mist,
                      fontFamily: F.bodyBold,
                      fontSize: 12,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View
        style={{
          marginTop: 20,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          backgroundColor: isPrivate ? 'rgba(184,168,232,0.10)' : C.card,
          borderWidth: 1,
          borderColor: isPrivate ? C.lavender : C.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Icon name="lock" size={16} color={isPrivate ? C.lavender : C.fog} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: C.bone, fontFamily: F.bodyBold }}>Private</Text>
          <Text style={{ fontSize: 11, color: C.fog, marginTop: 2 }}>
            {isPrivate ? 'Only you can see this entry' : 'Sofia can see this entry'}
          </Text>
        </View>
        <Pressable
          onPress={() => setIsPrivate((v) => !v)}
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            backgroundColor: isPrivate ? C.lavender : C.line,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 3,
              left: isPrivate ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#fff',
            }}
          />
        </Pressable>
      </View>
    </SheetShell>
  );
}
