import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { WhoDot } from '@/src/components/ui/WhoDot';
import { useTheme } from '@/src/lib/theme';
import {
  DAYS_FULL,
  DAYS_LETTER,
  DAYS_SHORT,
  DEMO_ITEMS,
  DEMO_TIMETABLES,
  fmtHour,
  type TimetableItem,
} from '@/src/lib/timetables-data';

type Layout = 'grid' | 'list' | 'timeline';

export default function TimetableDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, F } = useTheme();
  const table = DEMO_TIMETABLES.find((t) => String(t.id) === String(id)) ?? DEMO_TIMETABLES[0];

  const [layout, setLayout] = useState<Layout>('grid');
  const [selectedDay, setSelectedDay] = useState(2);
  const [weekOffset, setWeekOffset] = useState(0);

  return (
    <Screen>
      {/* Heading (Stack also shows back arrow native) */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: C.goldSoft,
            }}
          >
            <Text
              style={{
                color: C.gold,
                fontSize: 9,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
              }}
            >
              SHARED
            </Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 0.6,
            }}
          >
            Meals · week 42
          </Text>
        </View>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 24,
            color: C.bone,
            letterSpacing: -0.5,
            lineHeight: 26,
            marginTop: 2,
          }}
        >
          {table.title}
        </Text>
      </View>

      {/* Week nav + layout toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 999,
            padding: 3,
          }}
        >
          <Pressable
            onPress={() => setWeekOffset((w) => w - 1)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevronLeft" size={13} color={C.mist} />
          </Pressable>
          <Text
            style={{
              fontSize: 11,
              fontFamily: F.bodyBold,
              color: C.bone,
              minWidth: 70,
              textAlign: 'center',
            }}
          >
            {weekOffset === 0
              ? 'This week'
              : weekOffset > 0
                ? `In ${weekOffset}w`
                : `${-weekOffset}w ago`}
          </Text>
          <Pressable
            onPress={() => setWeekOffset((w) => w + 1)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevronRight" size={13} color={C.mist} />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 999,
            padding: 3,
          }}
        >
          {(
            [
              { k: 'grid', i: 'grid' },
              { k: 'list', i: 'moreH' },
              { k: 'timeline', i: 'clock' },
            ] as { k: Layout; i: IconName }[]
          ).map((o) => {
            const sel = layout === o.k;
            return (
              <Pressable
                key={o.k}
                onPress={() => setLayout(o.k)}
                style={{
                  width: 30,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: sel ? C.gold : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={o.i} size={13} color={sel ? C.ink : C.mist} strokeWidth={sel ? 2.4 : 2} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {layout === 'grid' && (
        <GridView selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
      )}
      {layout === 'list' && <ListView />}
      {layout === 'timeline' && (
        <TimelineView selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/sheets/new-timetable-item' as any)}
        style={{
          position: 'absolute',
          right: 22,
          bottom: 110,
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: C.gold,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.gold,
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Icon name="plus" size={22} color={C.ink} strokeWidth={2.8} />
      </Pressable>
    </Screen>
  );
}

function GridView({
  selectedDay,
  setSelectedDay,
}: {
  selectedDay: number;
  setSelectedDay: (n: number) => void;
}) {
  const { C, F } = useTheme();
  const dayItems = DEMO_ITEMS.filter((i) => i.day === selectedDay).sort((a, b) => a.start - b.start);
  const dayCounts = [0, 1, 2, 3, 4, 5, 6].map((d) => DEMO_ITEMS.filter((i) => i.day === d).length);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DAYS_SHORT.map((d, i) => {
            const active = i === selectedDay;
            const count = dayCounts[i];
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(i)}
                style={{
                  width: 54,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: active ? C.bone : C.card,
                  borderWidth: active ? 0 : 1,
                  borderColor: C.line,
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: F.bodyBold,
                    letterSpacing: 1,
                    color: active ? C.ash : C.fog,
                  }}
                >
                  {d}
                </Text>
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 18,
                    color: active ? C.ink : C.bone,
                  }}
                >
                  {14 + i}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: active ? C.ink : C.gold,
                      marginTop: 3,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 24,
              color: C.bone,
              letterSpacing: -0.6,
            }}
          >
            {DAYS_FULL[selectedDay]}
          </Text>
          <Text style={{ fontSize: 11, color: C.mist, marginTop: 3, fontFamily: F.body }}>
            {dayItems.length} item{dayItems.length !== 1 ? 's' : ''} ·{' '}
            {dayItems.reduce((s, i) => s + i.dur, 0).toFixed(1)}h scheduled
          </Text>
        </View>
        {selectedDay === 2 && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 5,
              backgroundColor: C.goldSoft,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: C.gold,
                fontFamily: F.bodyBold,
                letterSpacing: 1.2,
              }}
            >
              ★ DATE NIGHT
            </Text>
          </View>
        )}
      </View>

      <View style={{ gap: 10 }}>
        {dayItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

function ItemCard({ item }: { item: TimetableItem }) {
  const { F } = useTheme();
  return (
    <View
      style={{
        backgroundColor: item.color,
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View style={{ minWidth: 52 }}>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 20,
            color: item.ink,
            letterSpacing: -0.6,
          }}
        >
          {fmtHour(item.start)}
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: item.ink,
            fontFamily: F.bodyBold,
            letterSpacing: 0.8,
            opacity: 0.55,
            marginTop: 3,
          }}
        >
          {Math.round(item.dur * 60)} MIN
        </Text>
      </View>
      <View
        style={{
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: item.ink,
          opacity: 0.15,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 9,
            color: item.ink,
            fontFamily: F.bodyBold,
            letterSpacing: 1,
            opacity: 0.6,
            marginBottom: 3,
          }}
        >
          {item.cat.toUpperCase()}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: F.displayBold,
            fontSize: 15,
            color: item.ink,
            letterSpacing: -0.2,
          }}
        >
          {item.title}
          {item.star ? ' ★' : ''}
        </Text>
      </View>
      <WhoDot who={item.who} size={22} borderColor={item.color} />
    </View>
  );
}

function ListView() {
  const { C, F } = useTheme();
  const byDay = DAYS_FULL.map((name, i) => ({
    name,
    idx: i,
    items: DEMO_ITEMS.filter((it) => it.day === i).sort((a, b) => a.start - b.start),
  }));
  return (
    <View>
      {byDay.map(
        (d) =>
          d.items.length > 0 && (
            <View key={d.idx} style={{ marginBottom: 22 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 10,
                  marginBottom: 10,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 14,
                    color: C.bone,
                  }}
                >
                  {d.name}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
                <Text style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold }}>
                  {d.items.length}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {d.items.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: C.card,
                      borderWidth: 1,
                      borderColor: C.line,
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: F.displayBold,
                        fontSize: 12,
                        color: C.mist,
                        minWidth: 50,
                      }}
                    >
                      {fmtHour(item.start)}
                    </Text>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        backgroundColor: item.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={item.icon} size={14} color={item.ink} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 13, color: C.bone, fontFamily: F.body }}
                      >
                        {item.title}
                        {item.star ? ' ★' : ''}
                      </Text>
                      <Text style={{ fontSize: 10, color: C.ash, marginTop: 1, fontFamily: F.body }}>
                        {item.cat} · {Math.round(item.dur * 60)} min
                      </Text>
                    </View>
                    <WhoDot who={item.who} size={18} borderColor={C.card} />
                  </View>
                ))}
              </View>
            </View>
          )
      )}
    </View>
  );
}

function TimelineView({
  selectedDay,
  setSelectedDay,
}: {
  selectedDay: number;
  setSelectedDay: (n: number) => void;
}) {
  const { C, F } = useTheme();
  const dayItems = DEMO_ITEMS.filter((i) => i.day === selectedDay).sort((a, b) => a.start - b.start);
  const startHour = 6;
  const endHour = 23;
  const hourHeight = 42;
  const totalHours = endHour - startHour;

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {DAYS_LETTER.map((d, i) => {
          const active = i === selectedDay;
          const count = DEMO_ITEMS.filter((it) => it.day === i).length;
          return (
            <Pressable
              key={i}
              onPress={() => setSelectedDay(i)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: active ? C.bone : C.card,
                borderWidth: active ? 0 : 1,
                borderColor: C.line,
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: F.bodyBold,
                  color: active ? C.ink : C.mist,
                }}
              >
                {d}
              </Text>
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: F.bodyBold,
                  color: active ? C.ash : C.fog,
                  letterSpacing: 0.4,
                }}
              >
                {14 + i}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: count > 0 ? (active ? C.ink : C.gold) : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 18,
            color: C.bone,
            letterSpacing: -0.4,
          }}
        >
          {DAYS_FULL[selectedDay]}
        </Text>
        <Text style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold }}>6 AM — 11 PM</Text>
      </View>

      <View style={{ position: 'relative', paddingLeft: 42, minHeight: (totalHours + 1) * hourHeight }}>
        {Array.from({ length: totalHours + 1 }).map((_, i) => {
          const h = startHour + i;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: i * hourHeight,
                height: 1,
                backgroundColor: C.line,
                opacity: 0.5,
              }}
            >
              <Text
                style={{
                  position: 'absolute',
                  left: -42,
                  top: -6,
                  fontSize: 9,
                  fontFamily: F.bodyBold,
                  color: C.ash,
                  width: 38,
                  textAlign: 'right',
                }}
              >
                {fmtHour(h).toUpperCase()}
              </Text>
            </View>
          );
        })}
        {dayItems.map((item) => {
          const top = (item.start - startHour) * hourHeight;
          const height = item.dur * hourHeight - 3;
          return (
            <View
              key={item.id}
              style={{
                position: 'absolute',
                left: 4,
                right: 0,
                top,
                height,
                backgroundColor: item.color,
                borderRadius: 12,
                paddingVertical: 8,
                paddingHorizontal: 12,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 8,
                      fontFamily: F.bodyBold,
                      letterSpacing: 1,
                      opacity: 0.6,
                      color: item.ink,
                    }}
                  >
                    {item.cat.toUpperCase()}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: F.displayBold,
                      fontSize: 13,
                      color: item.ink,
                      letterSpacing: -0.2,
                      marginTop: 2,
                    }}
                  >
                    {item.title}
                    {item.star ? ' ★' : ''}
                  </Text>
                </View>
                <WhoDot who={item.who} size={16} borderColor={item.color} />
              </View>
              {height > 50 && (
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: F.bodyBold,
                    opacity: 0.6,
                    color: item.ink,
                    marginTop: 4,
                  }}
                >
                  {fmtHour(item.start)} – {fmtHour(item.start + item.dur)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
