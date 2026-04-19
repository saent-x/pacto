import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateSectioned, Display, Pill, RoundBtn } from '@/src/components/ui/atoms';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { TASK_LISTS } from '@/src/lib/tasks-data';

type Task = {
  id: number;
  title: string;
  done: boolean;
  priority: 'low' | 'med' | 'high';
  due: string | null;
  bucket: string;
};

const SEED: Task[] = [
  { id: 1, title: 'Book flights Milan → Venice', done: true, priority: 'high', due: 'MAR 20', bucket: 'Done' },
  { id: 2, title: 'Reserve hotel near San Marco', done: true, priority: 'high', due: 'MAR 22', bucket: 'Done' },
  { id: 3, title: 'Pack travel documents', done: false, priority: 'high', due: 'Today', bucket: 'Today' },
  { id: 4, title: 'Charge camera + power bank', done: false, priority: 'med', due: 'Today', bucket: 'Today' },
  { id: 5, title: 'Download offline maps', done: false, priority: 'med', due: 'Tomorrow', bucket: 'Tomorrow' },
  { id: 6, title: 'Confirm airport transfer', done: false, priority: 'high', due: 'Tomorrow', bucket: 'Tomorrow' },
  { id: 7, title: 'Make restaurant bookings', done: false, priority: 'med', due: 'Fri', bucket: 'This week' },
  { id: 8, title: 'Exchange currency', done: false, priority: 'low', due: 'Sat', bucket: 'This week' },
  { id: 9, title: 'Buy travel adapters', done: false, priority: 'low', due: 'May 4', bucket: 'May' },
  { id: 10, title: 'Print backup tickets', done: false, priority: 'med', due: 'May 8', bucket: 'May' },
  { id: 11, title: 'Pre-book gondola ride', done: false, priority: 'low', due: 'May 14', bucket: 'May' },
  { id: 12, title: 'Pack medicine kit', done: false, priority: 'med', due: null, bucket: 'Later' },
  { id: 13, title: 'Research gondola routes', done: false, priority: 'low', due: null, bucket: 'Later' },
];

const BUCKET_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'May', 'Jun', 'Later'];

export default function TaskListDetail() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { C, F } = useTheme();
  const insets = useSafeAreaInsets();
  const list = TASK_LISTS.find((l) => String(l.id) === String(listId)) ?? TASK_LISTS[0];
  const color = (C as any)[list.colorKey] as string;
  const [tasks, setTasks] = useState<Task[]>(SEED);

  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const doneCount = done.length;
  const pct = tasks.length ? doneCount / tasks.length : 0;

  const bucketColor: Record<string, string> = useMemo(
    () => ({
      Overdue: C.error,
      Today: C.gold,
      Tomorrow: C.peach,
      'This week': C.lavender,
      May: C.sky,
      Jun: C.butter,
      Later: C.fog,
    }),
    [C]
  );
  const sections = BUCKET_ORDER.map((b) => ({
    label: b.toUpperCase(),
    color: bucketColor[b],
    items: active.filter((t) => t.bucket === b),
  })).filter((s) => s.items.length);

  const toggle = (tid: number) =>
    setTasks((xs) => xs.map((x) => (x.id === tid ? { ...x, done: !x.done } : x)));

  const prioColor = useMemo(
    () => ({ high: C.error, med: C.butter, low: C.ash }),
    [C]
  );

  const renderRow = (t: Task) => (
    <View
      key={t.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <Pressable
        onPress={() => toggle(t.id)}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: C.ash,
        }}
      />
      <Text
        style={{ flex: 1, fontSize: 14, color: C.bone, fontFamily: F.body }}
      >
        {t.title}
      </Text>
      {t.due && (
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 0.6,
            backgroundColor: C.cardHi,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          {t.due.toUpperCase()}
        </Text>
      )}
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: prioColor[t.priority],
        }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 18,
          paddingBottom: 18,
          backgroundColor: C.coal,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <RoundBtn icon="chevronLeft" size={38} onPress={() => router.back()} />
          <Pill active bg={`${color}25`} color={color} size="sm">
            {list.name.toUpperCase()}
          </Pill>
          <RoundBtn
            icon="plus"
            size={38}
            onPress={() => router.push(`/sheets/new-task?listId=${list.id}` as any)}
          />
        </View>
        <Display size={34}>{list.name}</Display>
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              flex: 1,
              height: 4,
              backgroundColor: C.line,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color }} />
          </View>
          <Text style={{ fontFamily: F.displayBold, fontSize: 13, color: C.bone }}>
            {doneCount}
            <Text style={{ color: C.fog }}>/{tasks.length}</Text>
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <DateSectioned sections={sections} maxOpen={3} renderItem={renderRow} />

        {done.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 4,
                marginBottom: 10,
              }}
            >
              <Icon name="chevronDown" size={12} color={C.fog} />
              <Text
                style={{
                  color: C.fog,
                  fontSize: 10,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                Completed · {done.length}
              </Text>
            </View>
            <View style={{ gap: 8, opacity: 0.55 }}>
              {done.map((t) => (
                <View
                  key={t.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: C.line,
                  }}
                >
                  <Pressable
                    onPress={() => toggle(t.id)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="check" size={12} color={C.ink} strokeWidth={3} />
                  </Pressable>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: C.fog,
                      fontFamily: F.body,
                      textDecorationLine: 'line-through',
                    }}
                  >
                    {t.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
