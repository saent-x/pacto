import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, format, startOfWeek } from 'date-fns';
import {
  ActionEmptyState,
  type Bucket,
  BucketedList,
  HeaderBrand,
  SegmentedTabs,
} from '@/src/components/ui/pacto';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTimetable } from '@/src/hooks/useTimetables';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import {
  DAYS_FULL,
  fmtHour,
  type TimetableItem,
  type Who,
} from '@/src/lib/timetables-data';

type LayoutMode = 'grid' | 'list' | 'timeline';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HOUR_HEIGHT = 44;

const PEACH = '#F4A68C';
const PEACH_INK = '#3A1F14';
const LAV = '#B8A8E8';
const LAV_INK = '#1F1635';

function WhoBadge({
  who,
  size = 22,
  borderColor,
}: {
  who: Who;
  size?: number;
  borderColor: string;
}) {
  const fontSize = Math.round(size * 0.5);
  const bubble = (bg: string, fg: string, letter: string, overlap = false) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: overlap ? -5 : 0,
        borderWidth: overlap ? 1.5 : 0,
        borderColor,
      }}
    >
      <Text
        style={{
          color: fg,
          fontSize,
          fontFamily: Typography.geistSemiBoldFont,
        }}
      >
        {letter}
      </Text>
    </View>
  );
  if (who === 'both') {
    return (
      <View style={{ flexDirection: 'row' }}>
        {bubble(PEACH, PEACH_INK, 'M')}
        {bubble(LAV, LAV_INK, 'S', true)}
      </View>
    );
  }
  if (who === 'sofia') return bubble(LAV, LAV_INK, 'S');
  return bubble(PEACH, PEACH_INK, 'M');
}

export default function TimetableDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idString = Array.isArray(id) ? id[0] : id;
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { timetable, items, isLoading } = useTimetable(idString ?? null);

  const todayDow = useMemo(() => (new Date().getDay() + 6) % 7, []);
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [weekOffset, setWeekOffset] = useState(0);
  const [layout, setLayout] = useState<LayoutMode>('grid');

  const monday = useMemo(
    () => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7),
    [weekOffset],
  );

  const dayCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const it of items) {
      const mondayFirst = ((it.day ?? 0) + 6) % 7;
      counts[mondayFirst] += 1;
    }
    return counts;
  }, [items]);

  const dayItems = useMemo(() => {
    const sundayFirst = (selectedDay + 1) % 7;
    return items
      .filter((it) => it.day === sundayFirst)
      .slice()
      .sort((a, b) => a.start - b.start);
  }, [items, selectedDay]);

  const totalHours = useMemo(
    () => dayItems.reduce((s, it) => s + it.dur, 0),
    [dayItems],
  );
  const hasStar = dayItems.some((it) => it.star);

  const goAdd = () => {
    if (!idString) return;
    router.push(`/sheets/new-timetable-item?timetableId=${idString}` as any);
  };
  const openItem = (item: TimetableItem) => {
    if (!idString) return;
    router.push(
      `/sheets/new-timetable-item?timetableId=${idString}&id=${String(item.id)}` as any,
    );
  };

  const titleLabel = (timetable?.title || 'timetable').toLowerCase();
  const weekLabel =
    weekOffset === 0
      ? format(monday, 'MMMM yyyy')
      : weekOffset > 0
        ? `In ${weekOffset}w`
        : `${-weekOffset}w ago`;

  const renderBody = () => {
    if (isLoading && !timetable) {
      return (
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <Text style={[Typography.body, { color: C.ink3 }]}>Loading…</Text>
        </View>
      );
    }
    if (!timetable) {
      return (
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <ActionEmptyState
            icon="grid"
            title="Timetable not found"
            body="This rhythm may have been removed."
            actionLabel="Back"
            onAction={() => router.back()}
          />
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <ActionEmptyState
            icon="plus"
            title="No blocks yet"
            body="Add the first block to this rhythm."
            actionLabel="Add block"
            onAction={goAdd}
          />
        </View>
      );
    }
    if (layout === 'grid') {
      return (
        <GridBody
          dayItems={dayItems}
          selectedDay={selectedDay}
          totalHours={totalHours}
          hasStar={hasStar}
          onOpenItem={openItem}
        />
      );
    }
    if (layout === 'list') {
      return (
        <ListBody
          items={items}
          todayDow={todayDow}
          onOpenItem={openItem}
        />
      );
    }
    return (
      <TimelineBody
        dayItems={dayItems}
        selectedDay={selectedDay}
        onOpenItem={openItem}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerTintColor: C.inkColor,
          title: '',
          headerTitleAlign: 'center',
          headerTitle: () => (
            <HeaderBrand eyebrow="TIMETABLE" title={titleLabel} />
          ),
          headerLeft: () => (
            <PressScale
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Icon
                name="chevronLeft"
                size={22}
                color={C.inkColor}
                strokeWidth={2.2}
              />
            </PressScale>
          ),
          headerRight: () => (
            <PressScale onPress={goAdd} hitSlop={12} style={{ padding: 4 }}>
              <Icon
                name="plus"
                size={22}
                color={C.inkColor}
                strokeWidth={2.2}
              />
            </PressScale>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Week strip — same as calendar */}
        <View style={styles.weekWrap}>
          <View style={styles.weekHeader}>
            <View style={styles.weekNav}>
              <PressScale
                hitSlop={10}
                onPress={() => setWeekOffset((w) => w - 1)}
                style={styles.weekNavBtn}
              >
                <Icon
                  name="chevronLeft"
                  size={16}
                  color={C.ink2}
                  strokeWidth={2.2}
                />
              </PressScale>
              <Text style={[Typography.captionMedium, { color: C.ink2 }]}>
                {weekLabel}
              </Text>
              <PressScale
                hitSlop={10}
                onPress={() => setWeekOffset((w) => w + 1)}
                style={styles.weekNavBtn}
              >
                <Icon
                  name="chevronRight"
                  size={16}
                  color={C.ink2}
                  strokeWidth={2.2}
                />
              </PressScale>
            </View>
            <SegmentedTabs<LayoutMode>
              variant="compact"
              value={layout}
              onChange={setLayout}
              options={[
                { key: 'grid', icon: 'grid' },
                { key: 'list', icon: 'hash' },
                { key: 'timeline', icon: 'clock' },
              ]}
            />
          </View>

          <View style={styles.weekStrip}>
            {DAY_LABELS.map((label, i) => {
              const date = addDays(monday, i);
              const isSelected = i === selectedDay;
              const isToday =
                weekOffset === 0 && i === todayDow;
              const hasEvent = dayCounts[i] > 0;
              const numColor = isSelected
                ? C.bg
                : isToday
                  ? C.accent
                  : C.inkColor;
              const labelColor = isSelected ? C.bg : C.ink3;
              const dotColor = isSelected ? C.bg : C.accent;
              return (
                <PressScale
                  key={i}
                  onPress={() => setSelectedDay(i)}
                  style={[
                    styles.dayCell,
                    isSelected ? { backgroundColor: C.inkColor } : null,
                  ]}
                >
                  <Text
                    style={[
                      Typography.eyebrowSm,
                      { color: labelColor, fontSize: 9.5 },
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: Typography.geistSemiBoldFont,
                      fontSize: 16,
                      color: numColor,
                      marginTop: 4,
                      fontWeight: isToday || isSelected ? '600' : '400',
                    }}
                  >
                    {format(date, 'd')}
                  </Text>
                  <View style={styles.dayDotRow}>
                    {hasEvent ? (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 999,
                          backgroundColor: dotColor,
                          opacity: isSelected ? 0.85 : 1,
                        }}
                      />
                    ) : null}
                  </View>
                </PressScale>
              );
            })}
          </View>
        </View>

        {renderBody()}
      </ScrollView>
    </View>
  );
}

// ─── Grid layout — pastel item cards ───────────────────────────
function GridBody({
  dayItems,
  selectedDay,
  totalHours,
  hasStar,
  onOpenItem,
}: {
  dayItems: TimetableItem[];
  selectedDay: number;
  totalHours: number;
  hasStar: boolean;
  onOpenItem: (item: TimetableItem) => void;
}) {
  const { C } = useTheme();
  return (
    <View style={{ paddingHorizontal: 18 }}>
      <View style={styles.dayHeaderWrap}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.dayHeaderTitle, { color: C.inkColor }]}>
            {DAYS_FULL[selectedDay]}
          </Text>
          <Text
            style={[
              Typography.caption,
              { color: C.ink3, marginTop: 4 },
            ]}
          >
            {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'} ·{' '}
            {totalHours.toFixed(1)}h scheduled
          </Text>
        </View>
        {hasStar ? (
          <View style={[styles.starChip, { backgroundColor: C.accentSoft }]}>
            <Text
              style={[
                Typography.captionMedium,
                { color: C.accent, fontSize: 10, letterSpacing: 1.2 },
              ]}
            >
              ★ DATE NIGHT
            </Text>
          </View>
        ) : null}
      </View>

      {dayItems.length === 0 ? (
        <View style={[styles.emptyDay, { borderColor: C.lineColor }]}>
          <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
            NOTHING ON
          </Text>
          <Text
            style={[
              Typography.body,
              { color: C.ink2, marginTop: 4, textAlign: 'center' },
            ]}
          >
            Nothing scheduled on {DAYS_FULL[selectedDay]}.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {dayItems.map((item) => (
            <PressScale
              key={String(item.id)}
              onPress={() => onOpenItem(item)}
              style={[styles.itemCard, { backgroundColor: item.color }]}
            >
              <View style={styles.itemTimeCol}>
                <Text style={[styles.itemTime, { color: item.ink }]}>
                  {fmtHour(item.start)}
                </Text>
                <Text
                  style={[
                    styles.itemDur,
                    { color: item.ink, opacity: 0.55 },
                  ]}
                >
                  {Math.round(item.dur * 60)} MIN
                </Text>
              </View>
              <View
                style={[styles.itemDivider, { backgroundColor: item.ink }]}
              />
              <View style={styles.itemContent}>
                <Text
                  style={[styles.itemCat, { color: item.ink, opacity: 0.6 }]}
                >
                  {String(item.cat || '').toUpperCase()}
                </Text>
                <Text
                  style={[styles.itemTitle, { color: item.ink }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>
              <WhoBadge who={item.who} size={22} borderColor={item.color} />
              {item.star ? (
                <Text style={[styles.itemStar, { color: item.ink }]}>★</Text>
              ) : null}
            </PressScale>
          ))}

        </View>
      )}
    </View>
  );
}

// ─── List layout — bucketed by day, matches reminders row ─────
function ListBody({
  items,
  todayDow,
  onOpenItem,
}: {
  items: TimetableItem[];
  todayDow: number;
  onOpenItem: (item: TimetableItem) => void;
}) {
  const { C } = useTheme();
  const buckets = useMemo<Bucket<TimetableItem>[]>(() => {
    return DAYS_FULL.map((name, mondayIdx) => {
      const sundayFirst = (mondayIdx + 1) % 7;
      const rows = items
        .filter((it) => it.day === sundayFirst)
        .slice()
        .sort((a, b) => a.start - b.start);
      return {
        label: name,
        dotColor: mondayIdx === todayDow ? C.accent : C.ink2,
        rows,
      };
    }).filter((b) => b.rows.length > 0);
  }, [items, todayDow, C.accent, C.ink2]);

  if (buckets.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 18 }}>
      <BucketedList
        buckets={buckets}
        rowKey={(it) => String(it.id)}
        renderRow={(item) => (
          <PressScale
            onPress={() => onOpenItem(item)}
            style={[
              styles.reminderRow,
              styles.reminderRowPadding,
              { backgroundColor: C.bgCard },
            ]}
          >
            <View
              style={[
                styles.listIconTile,
                { backgroundColor: item.color },
              ]}
            >
              <Icon
                name={(item.icon as IconName) ?? 'coffee'}
                size={16}
                color={item.ink}
                strokeWidth={2.2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[Typography.bodyMedium, { color: C.inkColor }]}
                numberOfLines={2}
              >
                {item.title}
                {item.star ? (
                  <Text style={{ color: C.accent }}> ★</Text>
                ) : null}
              </Text>
              <View style={styles.reminderMetaRow}>
                <Text
                  style={[Typography.mono, { color: C.ink3, fontSize: 11 }]}
                >
                  {fmtHour(item.start)} · {Math.round(item.dur * 60)}m
                </Text>
                {item.cat ? (
                  <Text
                    style={[
                      Typography.captionMedium,
                      { color: C.ink3, fontSize: 10, letterSpacing: 0.6 },
                    ]}
                  >
                    {String(item.cat).toUpperCase()}
                  </Text>
                ) : null}
                <WhoBadge who={item.who} size={16} borderColor={C.bgCard} />
              </View>
            </View>
          </PressScale>
        )}
      />
    </View>
  );
}

// ─── Timeline layout — hour gutter + absolute blocks ──────────
function TimelineBody({
  dayItems,
  selectedDay,
  onOpenItem,
}: {
  dayItems: TimetableItem[];
  selectedDay: number;
  onOpenItem: (item: TimetableItem) => void;
}) {
  const { C } = useTheme();
  const startHour = 6;
  const endHour = 23;
  const totalHours = endHour - startHour;
  const gridHeight = (totalHours + 1) * HOUR_HEIGHT;

  return (
    <View style={{ paddingHorizontal: 18 }}>
      <View style={styles.timelineHeader}>
        <Text style={[styles.dayHeaderTitle, { color: C.inkColor }]}>
          {DAYS_FULL[selectedDay]}
        </Text>
        <Text
          style={[
            Typography.mono,
            { color: C.ink3, fontSize: 10 },
          ]}
        >
          6 AM — 11 PM
        </Text>
      </View>

      {dayItems.length === 0 ? (
        <View style={[styles.emptyDay, { borderColor: C.lineColor }]}>
          <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
            NOTHING ON
          </Text>
          <Text
            style={[
              Typography.body,
              { color: C.ink2, marginTop: 4, textAlign: 'center' },
            ]}
          >
            Nothing scheduled on {DAYS_FULL[selectedDay]}.
          </Text>
        </View>
      ) : (
        <View style={{ position: 'relative', paddingLeft: 44 }}>
          {Array.from({ length: totalHours + 1 }).map((_, i) => {
            const h = startHour + i;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: i * HOUR_HEIGHT,
                  height: 1,
                  backgroundColor: C.lineColor,
                  opacity: 0.5,
                }}
              >
                <Text
                  style={{
                    position: 'absolute',
                    left: -44,
                    top: -6,
                    fontFamily: Typography.geistMonoFont,
                    fontSize: 9,
                    color: C.ink3,
                    letterSpacing: 0.4,
                    width: 40,
                    textAlign: 'right',
                  }}
                >
                  {fmtHour(h).toUpperCase()}
                </Text>
              </View>
            );
          })}

          <View style={{ height: gridHeight, position: 'relative' }}>
            {dayItems.map((item) => {
              const top = (item.start - startHour) * HOUR_HEIGHT;
              const height = Math.max(36, item.dur * HOUR_HEIGHT - 3);
              return (
                <PressScale
                  key={String(item.id)}
                  onPress={() => onOpenItem(item)}
                  style={{
                    position: 'absolute',
                    left: 4,
                    right: 0,
                    top,
                    height,
                    backgroundColor: item.color,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.itemCat,
                          { color: item.ink, opacity: 0.6 },
                        ]}
                      >
                        {String(item.cat || '').toUpperCase()}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.timelineBlockTitle,
                          { color: item.ink },
                        ]}
                      >
                        {item.title}
                        {item.star ? ' ★' : ''}
                      </Text>
                    </View>
                    <WhoBadge
                      who={item.who}
                      size={16}
                      borderColor={item.color}
                    />
                  </View>
                  {height > 50 ? (
                    <Text
                      style={{
                        fontFamily: Typography.geistMonoFont,
                        fontSize: 9,
                        color: item.ink,
                        opacity: 0.6,
                        letterSpacing: 0.3,
                        marginTop: 4,
                      }}
                    >
                      {fmtHour(item.start)} – {fmtHour(item.start + item.dur)}
                    </Text>
                  ) : null}
                </PressScale>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  weekWrap: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  dayDotRow: {
    height: 6,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  dayHeaderTitle: {
    fontFamily: Typography.pixelFont,
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 24,
    textTransform: 'uppercase',
  },
  starChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  emptyDay: {
    paddingVertical: 32,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingLeft: 18,
    paddingRight: 16,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  itemTimeCol: {
    minWidth: 56,
  },
  itemTime: {
    fontFamily: Typography.pixelFont,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  itemDur: {
    fontFamily: Typography.geistMonoFont,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginTop: 4,
  },
  itemDivider: {
    width: 1,
    alignSelf: 'stretch',
    opacity: 0.15,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemCat: {
    fontFamily: Typography.geistMonoFont,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 3,
  },
  itemTitle: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 15,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  itemStar: {
    position: 'absolute',
    top: 10,
    right: 12,
    fontSize: 12,
  },
  // List (reminders-style row)
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reminderRowPadding: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  listIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Timeline
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timelineBlockTitle: {
    fontFamily: Typography.geistSemiBoldFont,
    fontSize: 13,
    letterSpacing: -0.2,
    lineHeight: 16,
    marginTop: 2,
  },
});
