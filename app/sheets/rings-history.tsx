import { Text, View } from 'react-native';
import { TripleRing } from '@/src/components/ui/atoms';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function seededValues(day: number): [number, number, number] {
  const a = 0.4 + ((day * 37) % 60) / 100;
  const b = 0.35 + ((day * 53) % 65) / 100;
  const c = 0.3 + ((day * 71) % 70) / 100;
  return [Math.min(1, a), Math.min(1, b), Math.min(1, c)];
}

function Month({
  label,
  firstDay,
  daysInMonth,
  today,
  future,
}: {
  label: string;
  firstDay: number;
  daysInMonth: number;
  today?: number;
  future?: boolean;
}) {
  const { C, F } = useTheme();

  const rings: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++)
    rings.push(<View key={`e${i}`} style={{ width: '14.28%' }} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today === d;
    const isFutureDay = future === true || (!!today && d > today);
    const values = isFutureDay ? [0, 0, 0] : seededValues(d);
    const colors: [string, string, string] = isFutureDay
      ? ['rgba(244,166,140,0.22)', 'rgba(228,178,74,0.22)', 'rgba(184,168,232,0.22)']
      : [C.peach, C.gold, C.lavender];
    rings.push(
      <View
        key={d}
        style={{
          width: '14.28%',
          alignItems: 'center',
          paddingVertical: 6,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isToday ? C.error : 'transparent',
          }}
        >
          <TripleRing
            size={36}
            stroke={3.5}
            gap={1.5}
            values={values}
            colors={colors}
            bg="rgba(255,255,255,0.08)"
          />
        </View>
        <Text
          style={{
            fontSize: 11,
            fontFamily: F.bodyBold,
            color: isToday ? C.bone : C.mist,
            marginTop: 4,
          }}
        >
          {d}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontFamily: F.displayBold,
          fontSize: 20,
          color: C.bone,
          letterSpacing: -0.4,
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
              color: C.fog,
              letterSpacing: 0.5,
            }}
          >
            {w}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{rings}</View>
    </View>
  );
}

export default function RingsHistory() {
  return (
    <SheetShell>
      <Month label="March 2026" firstDay={6} daysInMonth={31} />
      <Month label="April 2026" firstDay={2} daysInMonth={30} today={18} />
    </SheetShell>
  );
}
