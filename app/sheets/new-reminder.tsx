import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

const CATS = ['General', 'Date night', 'Anniversary', 'Health', 'Bills', 'Travel'];
const REPEATS = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const PRIORITIES: { k: 'low' | 'med' | 'high'; icon: IconName; dots: number }[] = [
  { k: 'low', icon: 'arrowDown', dots: 1 },
  { k: 'med', icon: 'minus', dots: 2 },
  { k: 'high', icon: 'chevronsUp', dots: 3 },
];
const ASSIGNEES: { k: 'both' | 'me' | 'sofia'; l: string }[] = [
  { k: 'both', l: 'Both' },
  { k: 'me', l: 'Me' },
  { k: 'sofia', l: 'Sofia' },
];

export default function NewReminder() {
  const { C, F } = useTheme();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'med' | 'high'>('med');
  const [assignee, setAssignee] = useState<'both' | 'me' | 'sofia'>('both');
  const [cat, setCat] = useState('General');
  const [repeat, setRepeat] = useState('None');

  return (
    <SheetShell
      eyebrow="NEW REMINDER"
      eyebrowColor={C.reminders}
      title="Don't forget."
      footer={<PrimaryButton icon="check" onPress={() => router.back()}>Save reminder</PrimaryButton>}
    >
      <Overline style={{ marginBottom: 8 }}>What to remember</Overline>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Call Sofia's mom for her birthday..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: title ? C.gold : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Notes</Overline>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add details..."
          placeholderTextColor={C.fog}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 80,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 14,
            padding: 14,
            color: C.bone,
            fontSize: 14,
            fontFamily: F.body,
          }}
        />
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>When</Overline>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field icon="calendar" label="Apr 18, 2026" />
          <Field icon="clock" label="6:00 PM" />
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Priority</Overline>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRIORITIES.map((p) => {
            const active = priority === p.k;
            return (
              <Pressable
                key={p.k}
                onPress={() => setPriority(p.k)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: active ? `${C.reminders}26` : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? C.reminders : C.line,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name={p.icon} size={18} color={active ? C.reminders : C.mist} strokeWidth={2.5} />
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor:
                          i < p.dots
                            ? active
                              ? C.reminders
                              : C.mist
                            : active
                              ? `${C.reminders}33`
                              : C.line,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Category</Overline>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 12 }}>
            {CATS.map((c) => (
              <Pill
                key={c}
                active={cat === c}
                activeBg={C.goldSoft}
                activeColor={C.gold}
                onPress={() => setCat(c)}
              >
                {c}
              </Pill>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Repeat</Overline>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {REPEATS.map((r) => (
            <Pill
              key={r}
              active={repeat === r}
              activeBg={C.goldSoft}
              activeColor={C.gold}
              onPress={() => setRepeat(r)}
            >
              {r}
            </Pill>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Assign to</Overline>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ASSIGNEES.map((a) => {
            const active = assignee === a.k;
            return (
              <Pressable
                key={a.k}
                onPress={() => setAssignee(a.k)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: active ? C.cardHi : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? C.gold : C.line,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: active ? C.bone : C.mist,
                    fontFamily: F.bodyBold,
                    fontSize: 12,
                  }}
                >
                  {a.l}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SheetShell>
  );
}

function Field({ icon, label }: { icon: IconName; label: string }) {
  const { C, F } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Icon name={icon} size={16} color={C.reminders} />
      <Text style={{ color: C.bone, fontSize: 13, fontFamily: F.bodyBold }}>{label}</Text>
    </View>
  );
}
