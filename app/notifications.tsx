import { Text, View } from 'react-native';
import { IconTile, Overline } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';

type Item = {
  id: number;
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  time: string;
  unread?: boolean;
};

export default function Notifications() {
  const { C, F } = useTheme();
  const today: Item[] = [
    { id: 1, icon: 'heart', color: C.rose, title: 'Sofia sent you a note', sub: '"Coffee\'s on, your socks are in the dryer."', time: '7:14 AM', unread: true },
    { id: 2, icon: 'sun', color: C.butter, title: 'Check-in · 4-day streak', sub: 'Sofia just checked in — bright', time: '8:32 AM', unread: true },
    { id: 3, icon: 'bell', color: C.lavender, title: 'Reminder · Call mom', sub: 'Due today at 6:00 PM', time: '6h', unread: false },
  ];
  const earlier: Item[] = [
    { id: 4, icon: 'dollarSign', color: C.mint, title: 'Sofia added €42 expense', sub: 'Airbnb deposit · Venice', time: 'Wed' },
    { id: 5, icon: 'flag', color: C.peach, title: '3 years · in 1 day', sub: "Don't forget the reservation.", time: 'Tue' },
    { id: 6, icon: 'calendar', color: C.peach, title: 'Timetable updated', sub: 'Sofia added Pizza night · Friday 8pm', time: 'Mon' },
  ];

  return (
    <Screen>
      <Overline style={{ marginBottom: 12, paddingLeft: 4 }}>Today</Overline>
      <View style={{ gap: 10 }}>
        {today.map((n) => (
          <Row key={n.id} n={n} />
        ))}
      </View>
      <Overline style={{ marginTop: 24, marginBottom: 12, paddingLeft: 4 }}>Earlier</Overline>
      <View style={{ gap: 10 }}>
        {earlier.map((n) => (
          <Row key={n.id} n={n} />
        ))}
      </View>
    </Screen>
  );
}

function Row({ n }: { n: Item }) {
  const { C, F } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        alignItems: 'flex-start',
      }}
    >
      <IconTile icon={n.icon} bg={`${n.color}22`} color={n.color} size={38} iconSize={17} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{ flex: 1, fontSize: 14, color: C.bone, fontFamily: F.bodyBold }}
            numberOfLines={1}
          >
            {n.title}
          </Text>
          {n.unread && (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold }} />
          )}
        </View>
        <Text style={{ fontSize: 12, color: C.mist, marginTop: 2, fontFamily: F.body }}>
          {n.sub}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            marginTop: 4,
            fontFamily: F.bodyBold,
            letterSpacing: 0.6,
          }}
        >
          {n.time}
        </Text>
      </View>
    </View>
  );
}
