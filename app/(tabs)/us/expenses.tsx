import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AddBtn } from '@/src/components/ui/AddBtn';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { SubHeader } from '@/src/components/ui/SubHeader';
import { useTheme } from '@/src/lib/theme';

export default function Expenses() {
  const { C, F } = useTheme();
  const items = [
    { t: 'Groceries · Coop', amt: 64.5, by: 'mattia', split: '50/50', day: 'TODAY' },
    { t: 'Airbnb deposit · Venice', amt: 240.0, by: 'sofia', split: '50/50', day: 'WED' },
    { t: 'Date night — Osteria', amt: 78.0, by: 'mattia', split: '50/50', day: 'TUE' },
    { t: 'Electric bill', amt: 142.0, by: 'sofia', split: '50/50', day: 'MON' },
  ];

  return (
    <Screen>
      <View style={{ backgroundColor: C.mint, borderRadius: 26, padding: 22, marginBottom: 18 }}>
        <Text
          style={{
            fontSize: 10,
            color: C.mintInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            opacity: 0.55,
            marginBottom: 6,
          }}
        >
          SOFIA OWES YOU
        </Text>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 56,
            color: C.mintInk,
            lineHeight: 50,
            letterSpacing: -2.5,
          }}
        >
          €42<Text style={{ fontSize: 28, opacity: 0.6 }}>.25</Text>
        </Text>
        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: C.mintInk,
              opacity: 0.7,
              fontFamily: F.bodyBold,
            }}
          >
            This month · €524 total
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: C.mintInk,
              opacity: 0.7,
              fontFamily: F.bodyBold,
              letterSpacing: 0.8,
            }}
          >
            SETTLE →
          </Text>
        </View>
        <View
          style={{
            marginTop: 12,
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.12)',
            borderRadius: 3,
            overflow: 'hidden',
            flexDirection: 'row',
          }}
        >
          <View style={{ width: '58%', backgroundColor: C.mintInk }} />
          <View style={{ width: '42%', backgroundColor: 'rgba(15,44,26,0.45)' }} />
        </View>
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 10, color: C.mintInk, opacity: 0.6, fontFamily: F.bodyBold, letterSpacing: 0.8 }}>
            YOU · €305
          </Text>
          <Text style={{ fontSize: 10, color: C.mintInk, opacity: 0.6, fontFamily: F.bodyBold, letterSpacing: 0.8 }}>
            SOFIA · €219
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: 11,
          color: C.fog,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          paddingLeft: 4,
          marginBottom: 10,
        }}
      >
        RECENT
      </Text>

      {items.map((x, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 14,
            backgroundColor: C.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: C.mintInk,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="dollarSign" size={16} color={C.mint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 14,
                color: C.bone,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {x.t}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: C.fog,
                fontFamily: F.bodyBold,
                marginTop: 2,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {x.day} · {x.by} paid · {x.split}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 16,
              color: C.bone,
              letterSpacing: -0.3,
            }}
          >
            €{x.amt.toFixed(2)}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
