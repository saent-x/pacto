import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Overline, Pill, PrimaryButton } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { DAYS_LETTER } from '@/src/lib/timetables-data';

type Who = 'me' | 'sofia' | 'both';
type Cat = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type Repeat = 'weekly' | 'once';

const CATS: { k: Cat; color: string; ink: string; icon: IconName }[] = [
  { k: 'Breakfast', color: '#F4A68C', ink: '#3A1F14', icon: 'coffee' },
  { k: 'Lunch', color: '#A8D8B9', ink: '#0F2C1A', icon: 'feather' },
  { k: 'Dinner', color: '#F2D86A', ink: '#3A2E08', icon: 'coffee' },
  { k: 'Snack', color: '#D89BA8', ink: '#3A1520', icon: 'gift' },
];
const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function NewTimetableItem() {
  const { C, F } = useTheme();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Cat>('Dinner');
  const [time, setTime] = useState('7:00 PM');
  const [dur, setDur] = useState(90);
  const [days, setDays] = useState<number[]>([2]);
  const [who, setWho] = useState<Who>('both');
  const [repeat, setRepeat] = useState<Repeat>('weekly');

  const active = CATS.find((c) => c.k === cat) ?? CATS[0];
  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));

  return (
    <SheetShell
      eyebrow={`NEW ITEM · ${cat.toUpperCase()}`}
      eyebrowColor={active.color}
      title="What's cooking."
      footer={<PrimaryButton icon="plus" onPress={() => router.back()}>Add to timetable</PrimaryButton>}
    >
      <View
        style={{
          backgroundColor: active.color,
          borderRadius: 22,
          paddingVertical: 16,
          paddingHorizontal: 18,
          marginBottom: 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ minWidth: 60 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 20,
              color: active.ink,
              letterSpacing: -0.6,
            }}
          >
            {time.replace(' ', '')}
          </Text>
          <Text
            style={{
              fontSize: 9,
              fontFamily: F.bodyBold,
              letterSpacing: 0.8,
              opacity: 0.55,
              color: active.ink,
              marginTop: 3,
            }}
          >
            {dur} MIN
          </Text>
        </View>
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: active.ink, opacity: 0.15 }} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontFamily: F.bodyBold,
              letterSpacing: 1,
              opacity: 0.6,
              color: active.ink,
            }}
          >
            {cat.toUpperCase()}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: F.displayBold,
              fontSize: 15,
              color: active.ink,
              letterSpacing: -0.2,
              marginTop: 2,
            }}
          >
            {title || 'Item title'}
          </Text>
        </View>
      </View>

      <Overline style={{ marginBottom: 8 }}>Title</Overline>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Risotto al limone..."
        placeholderTextColor={C.fog}
        style={{
          color: C.bone,
          fontFamily: F.displayBold,
          fontSize: 22,
          paddingVertical: 6,
          borderBottomWidth: 2,
          borderBottomColor: title ? active.color : C.line,
        }}
      />

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Category</Overline>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATS.map((c) => {
            const sel = cat === c.k;
            return (
              <Pressable
                key={c.k}
                onPress={() => setCat(c.k)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: sel ? c.color : C.card,
                  borderWidth: 1,
                  borderColor: sel ? c.color : C.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name={c.icon} size={13} color={sel ? c.ink : C.mist} strokeWidth={2.2} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: F.bodyBold,
                    color: sel ? c.ink : C.bone,
                  }}
                >
                  {c.k}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 22, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 8 }}>Time</Overline>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholderTextColor={C.fog}
            style={{
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 14,
              color: C.bone,
              fontFamily: F.displayBold,
              fontSize: 18,
            }}
          />
        </View>
        <View style={{ flex: 1.2 }}>
          <Overline style={{ marginBottom: 8 }}>Duration</Overline>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              padding: 4,
              gap: 4,
            }}
          >
            {DURATIONS.map((d) => {
              const sel = dur === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDur(d)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: sel ? active.color : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: F.bodyBold,
                      color: sel ? active.ink : C.mist,
                    }}
                  >
                    {d < 60 ? `${d}m` : d === 60 ? '1h' : `${(d / 60).toString().replace('.5', '½')}h`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <Overline style={{ marginBottom: 10 }}>Days</Overline>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAYS_LETTER.map((d, i) => {
            const sel = days.includes(i);
            return (
              <Pressable
                key={i}
                onPress={() => toggleDay(i)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: sel ? active.color : C.card,
                  borderWidth: 1,
                  borderColor: sel ? active.color : C.line,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 14,
                    color: sel ? active.ink : C.mist,
                  }}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          {[
            { l: 'Every day', d: [0, 1, 2, 3, 4, 5, 6] },
            { l: 'Weekdays', d: [0, 1, 2, 3, 4] },
            { l: 'Weekends', d: [5, 6] },
          ].map((p) => (
            <Pill key={p.l} onPress={() => setDays(p.d)}>
              {p.l}
            </Pill>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 22, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 8 }}>For</Overline>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              padding: 4,
              gap: 4,
            }}
          >
            {(
              [
                { k: 'me', l: 'Mattia' },
                { k: 'sofia', l: 'Sofia' },
                { k: 'both', l: 'Both' },
              ] as { k: Who; l: string }[]
            ).map((o) => {
              const sel = who === o.k;
              return (
                <Pressable
                  key={o.k}
                  onPress={() => setWho(o.k)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: sel ? C.bone : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: F.bodyBold,
                      color: sel ? C.ink : C.mist,
                    }}
                  >
                    {o.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Overline style={{ marginBottom: 8 }}>Repeats</Overline>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              padding: 4,
              gap: 4,
            }}
          >
            {(
              [
                { k: 'weekly', l: 'Weekly' },
                { k: 'once', l: 'Once' },
              ] as { k: Repeat; l: string }[]
            ).map((o) => {
              const sel = repeat === o.k;
              return (
                <Pressable
                  key={o.k}
                  onPress={() => setRepeat(o.k)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: sel ? C.bone : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: F.bodyBold,
                      color: sel ? C.ink : C.mist,
                    }}
                  >
                    {o.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SheetShell>
  );
}
