import { useMemo } from 'react';
import { Text, View } from 'react-native';
import {
  endOfDay,
  format,
  getDaysInMonth,
  isAfter,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { AnimatedTripleRing } from '@/src/components/ui/atoms';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { alphaColor } from '@/src/lib/color';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useRingsHistory, type RingValues } from '@/src/hooks/useRingsHistory';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function monthFirstWeekdayIndex(date: Date): number {
  return (startOfMonth(date).getDay() + 6) % 7;
}

function ringValuesFor(v: RingValues | undefined): [number, number, number] {
  return [v?.connect ?? 0, v?.shared ?? 0, v?.present ?? 0];
}

function Month({
  anchor,
  today,
  byDateKey,
  monthIdx,
}: {
  anchor: Date;
  today: Date;
  byDateKey: Map<string, RingValues>;
  monthIdx: number;
}) {
  const { C, F } = useTheme();
  const label = format(anchor, 'MMMM yyyy');
  const monthKey = format(anchor, 'yyyy-MM');
  const daysInMonth = getDaysInMonth(anchor);
  const firstDay = monthFirstWeekdayIndex(anchor);
  const todayEnd = endOfDay(today);
  const futureColors: [string, string, string] = [
    alphaColor(C.peach, 0.22),
    alphaColor(C.gold, 0.22),
    alphaColor(C.lavender, 0.22),
  ];

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<View key={`e${i}`} style={{ width: '14.28%' }} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(anchor.getFullYear(), anchor.getMonth(), d);
    const dateKey = format(dayDate, 'yyyy-MM-dd');
    const isTodayCell = isSameDay(dayDate, today);
    const isFutureDay = isAfter(dayDate, todayEnd);
    const data = byDateKey.get(dateKey);
    const hasData = !!data;
    const values: [number, number, number] =
      isFutureDay || !hasData ? [0, 0, 0] : ringValuesFor(data);
    const colors: [string, string, string] =
      isFutureDay || !hasData ? futureColors : [C.peach, C.gold, C.lavender];

    cells.push(
      <View
        key={d}
        testID={`rings-day-${dateKey}`}
        style={{ width: '14.28%', alignItems: 'center', paddingVertical: 6 }}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isTodayCell ? C.peach : 'transparent',
          }}
        >
          <AnimatedTripleRing
            size={36}
            stroke={3.5}
            gap={1.5}
            values={values}
            colors={colors}
            bg={alphaColor(C.inkColor, 0.08)}
            delay={monthIdx * 240 + (d - 1) * 8}
          />
        </View>
        <Text
          style={{
            fontSize: 11,
            fontFamily: F.bodyBold,
            color: isTodayCell ? C.peachInk : C.ink2,
            marginTop: 4,
          }}
        >
          {d}
        </Text>
      </View>,
    );
  }

  return (
    <View style={{ marginBottom: 24 }} testID={`rings-month-${monthKey}`}>
      <Text
        testID={`rings-month-label-${monthKey}`}
        style={{
          fontFamily: F.displayBold,
          fontSize: 20,
          color: C.inkColor,
          letterSpacing: 0,
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <Text
            key={i}
            style={{
              width: '14.28%',
              textAlign: 'center',
              fontSize: 11,
              fontFamily: F.bodyBold,
              color: C.ink3,
              letterSpacing: 0.5,
            }}
          >
            {w}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cells}</View>
    </View>
  );
}

export default function RingsHistory() {
  return (
    <FeatureRouteGuard featureId="checkins">
      <RingsHistoryContent />
    </FeatureRouteGuard>
  );
}

function RingsHistoryContent() {
  const { C, F } = useTheme();
  const { activeCouple } = useSession();
  const { byDateKey, error } = useRingsHistory();

  const today = useMemo(() => new Date(), []);
  const currentAnchor = useMemo(() => startOfMonth(today), [today]);
  const previousAnchor = useMemo(() => startOfMonth(subMonths(today, 1)), [today]);

  if (!activeCouple) {
    return (
      <SheetShell eyebrow="RINGS · HISTORY" title="Day by day.">
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text
            testID="rings-empty"
            style={{
              fontFamily: F.body,
              fontSize: 14,
              color: C.ink2,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            Connect a space to start tracking your rings.
          </Text>
        </View>
      </SheetShell>
    );
  }

  if (error) {
    console.warn('[rings-history] query error', error);
  }

  return (
    <SheetShell eyebrow="RINGS · HISTORY" title="Day by day.">
      <Month anchor={previousAnchor} today={today} byDateKey={byDateKey} monthIdx={0} />
      <Month anchor={currentAnchor} today={today} byDateKey={byDateKey} monthIdx={1} />
    </SheetShell>
  );
}
