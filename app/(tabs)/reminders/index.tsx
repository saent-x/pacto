import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  BlockCard,
  DateSectioned,
  Display,
  IconTile,
  Overline,
  Pill,
} from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';

type Item = {
  id: number;
  title: string;
  bucket: string;
  when: string;
  who: string;
  priority: 'low' | 'med' | 'high';
  done: boolean;
  overdue?: boolean;
};

const SEED: Item[] = [
  { id: 1, title: 'Call mom for her birthday', bucket: 'Today', when: '18:00', who: 'Mattia', priority: 'high', done: false },
  { id: 2, title: 'Pick up flowers', bucket: 'Today', when: '12:30', who: 'Both', priority: 'med', done: false },
  { id: 3, title: 'Water the plants', bucket: 'Overdue', when: 'Yesterday', who: 'Both', priority: 'low', done: false, overdue: true },
  { id: 4, title: 'Book Venice flights', bucket: 'Tomorrow', when: '14:00', who: 'Both', priority: 'high', done: false },
  { id: 5, title: 'Renew gym membership', bucket: 'This week', when: 'Fri', who: 'Sofia', priority: 'med', done: false },
  { id: 6, title: 'Dentist appointment', bucket: 'This week', when: 'Sat · 10:00', who: 'Mattia', priority: 'high', done: false },
  { id: 7, title: "Sofia's mom birthday", bucket: 'Apr 28', when: '', who: 'Both', priority: 'high', done: false },
  { id: 8, title: "Grandma's visit reminder", bucket: 'Apr 28', when: '09:00', who: 'Mattia', priority: 'med', done: false },
  { id: 9, title: 'Insurance renewal', bucket: 'May', when: 'May 3', who: 'Both', priority: 'high', done: false },
  { id: 10, title: 'Anniversary prep', bucket: 'May', when: 'May 18', who: 'Both', priority: 'high', done: false },
  { id: 11, title: 'Tax deadline', bucket: 'May', when: 'May 30', who: 'Mattia', priority: 'high', done: false },
  { id: 12, title: 'Summer rental check', bucket: 'Jun', when: 'Jun 6', who: 'Both', priority: 'med', done: false },
  { id: 13, title: 'Pay the rent', bucket: 'Done', when: 'Tue', who: 'Mattia', priority: 'high', done: true },
  { id: 14, title: 'Pick up dry cleaning', bucket: 'Done', when: 'Mon', who: 'Sofia', priority: 'low', done: true },
];

const FILTERS = ['All', 'Mine', "Sofia's", 'Shared', 'Overdue'];
const BUCKET_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Apr 28', 'May', 'Jun', 'Later'];

export default function RemindersScreen() {
  const { C, F } = useTheme();
  const [filter, setFilter] = useState('All');
  const [items, setItems] = useState(SEED);
  const toggle = (id: number) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const matchFilter = (x: Item) => {
    if (filter === 'All') return true;
    if (filter === 'Mine') return x.who === 'Mattia';
    if (filter === "Sofia's") return x.who === 'Sofia';
    if (filter === 'Shared') return x.who === 'Both';
    if (filter === 'Overdue') return !!x.overdue;
    return true;
  };
  const active = items.filter((x) => !x.done && matchFilter(x));
  const done = items.filter((x) => x.done && matchFilter(x));

  const bucketColor: Record<string, string> = {
    Overdue: C.error,
    Today: C.gold,
    Tomorrow: C.peach,
    'This week': C.lavender,
    'Apr 28': C.mint,
    May: C.sky,
    Jun: C.butter,
    Later: C.fog,
  };
  const sections = BUCKET_ORDER.map((b) => ({
    label: b.toUpperCase(),
    color: bucketColor[b],
    items: active.filter((x) => x.bucket === b),
  })).filter((s) => s.items.length);

  return (
    <Screen>
      <BlockCard bg={C.lavender} ink={C.lavenderInk} style={{ marginBottom: 16, padding: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Overline color="rgba(31,22,53,0.7)">This week</Overline>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
              <Display size={54} color={C.lavenderInk}>{`${active.length}`}</Display>
              <Text
                style={{
                  fontSize: 14,
                  color: 'rgba(31,22,53,0.6)',
                  fontFamily: F.bodyBold,
                  marginBottom: 8,
                }}
              >
                active
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: 'rgba(31,22,53,0.7)',
                marginTop: 6,
                fontFamily: F.body,
              }}
            >
              {items.filter((x) => x.bucket === 'Today').length} due today ·{' '}
              {items.filter((x) => x.overdue).length} overdue
            </Text>
          </View>
          <IconTile
            icon="bell"
            bg="rgba(31,22,53,0.15)"
            color={C.lavenderInk}
            size={44}
            radius={14}
            iconSize={20}
          />
        </View>
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 4, height: 6 }}>
          {[
            { w: 40, c: C.lavenderInk },
            { w: 25, c: 'rgba(31,22,53,0.45)' },
            { w: 20, c: 'rgba(31,22,53,0.3)' },
            { w: 15, c: 'rgba(31,22,53,0.18)' },
          ].map((s, i) => (
            <View key={i} style={{ flex: s.w, backgroundColor: s.c, borderRadius: 3 }} />
          ))}
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          {[`DONE ${done.length}`, `OPEN ${active.length}`, 'SNOOZED 2', 'PARTNER 4'].map((t) => (
            <Text
              key={t}
              style={{
                fontSize: 10,
                fontFamily: F.bodyBold,
                letterSpacing: 0.5,
                color: 'rgba(31,22,53,0.75)',
              }}
            >
              {t}
            </Text>
          ))}
        </View>
      </BlockCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {FILTERS.map((f) => (
            <Pill
              key={f}
              active={filter === f}
              activeBg={C.reminders}
              activeColor="#fff"
              onPress={() => setFilter(f)}
            >
              {f}
            </Pill>
          ))}
        </View>
      </ScrollView>

      <DateSectioned
        sections={sections}
        maxOpen={3}
        renderItem={(it) => <Row key={it.id} item={it} onToggle={() => toggle(it.id)} />}
      />

      {done.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 4,
              marginBottom: 12,
            }}
          >
            <Icon name="chevronDown" size={12} color={C.fog} />
            <Text
              style={{
                color: C.fog,
                fontSize: 11,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Completed · {done.length}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {done.map((it) => (
              <Row key={it.id} item={it} onToggle={() => toggle(it.id)} />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

function Row({ item, onToggle }: { item: Item; onToggle: () => void }) {
  const { C, F } = useTheme();
  const done = item.done;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 18,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: done ? 0 : 1.5,
          borderColor: C.ash,
          backgroundColor: done ? C.reminders : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontFamily: F.body,
            color: done ? C.fog : C.bone,
            textDecorationLine: done ? 'line-through' : 'none',
          }}
        >
          {item.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {!!item.when && (
            <>
              <Icon name="clock" size={10} color={item.overdue ? C.error : C.fog} />
              <Text
                style={{
                  fontSize: 10,
                  color: item.overdue ? C.error : C.fog,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.4,
                }}
              >
                {item.when}
              </Text>
              <Text style={{ color: C.ash }}>·</Text>
            </>
          )}
          <Text
            style={{
              fontSize: 10,
              color: C.mist,
              fontFamily: F.bodyBold,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {item.who}
          </Text>
        </View>
      </View>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor:
            item.priority === 'high' ? C.error : item.priority === 'med' ? C.butter : C.ash,
        }}
      />
    </View>
  );
}
