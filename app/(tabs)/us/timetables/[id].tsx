import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { WhoDot } from '@/src/components/ui/WhoDot';
import { useActionMenu } from '@/src/components/ui/ActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useTimetable } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import {
  DAYS_FULL,
  DAYS_LETTER,
  DAYS_SHORT,
  fmtHour,
  shareBadge,
  tmplByKey,
  type TimetableItem,
} from '@/src/lib/timetables-data';

type Layout = 'grid' | 'list' | 'timeline';

export default function TimetableDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idString = Array.isArray(id) ? id[0] : id;
  const { C, F } = useTheme();
  const { timetable, items, isLoading, remove } = useTimetable(idString ?? null);
  const actionMenu = useActionMenu();

  const [layout, setLayout] = useState<Layout>('grid');
  const [selectedDay, setSelectedDay] = useState(2);
  const [weekOffset, setWeekOffset] = useState(0);

  const openItemMenu = useCallback(
    (item: TimetableItem) => {
      actionMenu.open({
        title: item.title,
        subtitle: item.cat?.toUpperCase(),
        actions: [
          {
            key: 'edit',
            label: 'Edit',
            icon: 'edit',
            onPress: () => {
              if (!idString) return;
              router.push(`/sheets/new-timetable-item?timetableId=${idString}&id=${String(item.id)}` as any);
            },
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: 'trash',
            destructive: true,
            onPress: () => {
              confirmDestructive(
                'Delete item?',
                `"${item.title}" will be removed.`,
                () => remove(String(item.id)),
              );
            },
          },
        ],
      });
    },
    [actionMenu, idString, remove],
  );

  if (isLoading && !timetable) return <DetailSkeleton />;

  if (!timetable) {
    return (
      <Screen>
        <View
          style={{
            marginTop: 24,
            padding: 24,
            borderRadius: 22,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: C.line,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Icon name="grid" size={22} color={C.fog} />
          <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
            Timetable not found
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ fontSize: 12, color: C.gold, fontFamily: F.bodyBold, letterSpacing: 0.8 }}>
              BACK TO RHYTHMS →
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const tpl = tmplByKey(timetable.template);
  const badge = shareBadge(timetable.share);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(420)} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: badge.bg,
            }}
          >
            <Text
              style={{
                color: badge.color,
                fontSize: 9,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
              }}
            >
              {badge.label}
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
            {tpl.label} · {items.length} item{items.length === 1 ? '' : 's'}
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
          {timetable.title}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(80).duration(380)}
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
      </Animated.View>

      {items.length === 0 ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/sheets/new-timetable-item',
              params: { timetableId: id },
            } as any)
          }
          style={{
            padding: 24,
            borderRadius: 22,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: C.line,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="plus" size={22} color={C.fog} />
          <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
            No items yet
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: C.fog,
              fontFamily: F.body,
              textAlign: 'center',
            }}
          >
            Tap + to add your first entry for this rhythm.
          </Text>
        </Pressable>
      ) : layout === 'grid' ? (
        <GridView
          items={items}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          onItemLongPress={openItemMenu}
        />
      ) : layout === 'list' ? (
        <ListView items={items} onItemLongPress={openItemMenu} />
      ) : (
        <TimelineView
          items={items}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          onItemLongPress={openItemMenu}
        />
      )}

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/sheets/new-timetable-item',
            params: { timetableId: id },
          } as any)
        }
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
  items,
  selectedDay,
  setSelectedDay,
  onItemLongPress,
}: {
  items: TimetableItem[];
  selectedDay: number;
  setSelectedDay: (n: number) => void;
  onItemLongPress?: (item: TimetableItem) => void;
}) {
  const { C, F } = useTheme();
  const dayItems = items.filter((i) => i.day === selectedDay).sort((a, b) => a.start - b.start);
  const dayCounts = [0, 1, 2, 3, 4, 5, 6].map((d) => items.filter((i) => i.day === d).length);

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
        {dayItems.some((it) => it.star) ? (
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
              ★ STARRED
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        {dayItems.map((item, i) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(Math.min(i, 10) * 60 + 80).duration(400)}
          >
            <ItemCard item={item} onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function ItemCard({ item, onLongPress }: { item: TimetableItem; onLongPress?: () => void }) {
  const { F } = useTheme();
  return (
    <Pressable
      testID={`timetable-item-${item.id}`}
      onLongPress={onLongPress}
      delayLongPress={350}
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
    </Pressable>
  );
}

function ListView({
  items,
  onItemLongPress,
}: {
  items: TimetableItem[];
  onItemLongPress?: (item: TimetableItem) => void;
}) {
  const { C, F } = useTheme();
  const byDay = DAYS_FULL.map((name, i) => ({
    name,
    idx: i,
    items: items.filter((it) => it.day === i).sort((a, b) => a.start - b.start),
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
                {d.items.map((item, i) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(Math.min(i, 10) * 40 + 40).duration(360)}
                  >
                  <Pressable
                    testID={`timetable-item-list-${item.id}`}
                    onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
                    delayLongPress={350}
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
                  </Pressable>
                  </Animated.View>
                ))}
              </View>
            </View>
          ),
      )}
    </View>
  );
}

function TimelineView({
  items,
  selectedDay,
  setSelectedDay,
  onItemLongPress,
}: {
  items: TimetableItem[];
  selectedDay: number;
  setSelectedDay: (n: number) => void;
  onItemLongPress?: (item: TimetableItem) => void;
}) {
  const { C, F } = useTheme();
  const dayItems = items.filter((i) => i.day === selectedDay).sort((a, b) => a.start - b.start);
  const startHour = 6;
  const endHour = 23;
  const hourHeight = 42;
  const totalHours = endHour - startHour;

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
        {DAYS_LETTER.map((d, i) => {
          const active = i === selectedDay;
          const count = items.filter((it) => it.day === i).length;
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
        {dayItems.map((item, i) => {
          const top = (item.start - startHour) * hourHeight;
          const height = item.dur * hourHeight - 3;
          return (
            <Animated.View
              key={item.id}
              entering={FadeIn.delay(Math.min(i, 10) * 40 + 80).duration(360)}
              style={{
                position: 'absolute',
                left: 4,
                right: 0,
                top,
                height,
              }}
            >
            <Pressable
              testID={`timetable-item-timeline-${item.id}`}
              onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
              delayLongPress={350}
              style={{
                flex: 1,
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
            </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function DetailSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{ height: 50, marginBottom: 14, borderRadius: 10, backgroundColor: C.card, opacity: 0.55 }}
      />
      <Animated.View
        entering={FadeIn.delay(60).duration(300)}
        style={{ height: 38, marginBottom: 16, borderRadius: 999, backgroundColor: C.card, opacity: 0.55 }}
      />
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(120 + i * 60).duration(300)}
          style={{
            height: 72,
            borderRadius: 22,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            opacity: 0.55,
            marginBottom: 10,
          }}
        />
      ))}
    </Screen>
  );
}
