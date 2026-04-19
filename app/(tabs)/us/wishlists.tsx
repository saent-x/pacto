import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { AddBtn } from '@/src/components/ui/AddBtn';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { SubHeader } from '@/src/components/ui/SubHeader';
import { useTheme } from '@/src/lib/theme';

export default function Wishlists() {
  const { C, F } = useTheme();
  const filters = ['ALL', "SOFIA'S", 'MINE', 'SHARED', 'CLAIMED'];
  const items = [
    { t: 'Linen throw · oatmeal', price: '€80', who: 'sofia', tag: 'HOME', claimed: false },
    { t: 'Analog film · Portra 400', price: '€18 × 5', who: 'mattia', tag: 'HOBBY', claimed: true },
    { t: 'Pasta maker', price: '€160', who: 'both', tag: 'KITCHEN', claimed: false },
    { t: 'Weekend in Puglia', price: '€680', who: 'both', tag: 'TRAVEL', claimed: false },
    { t: 'Concert · Caetano Veloso', price: '€95', who: 'sofia', tag: 'DATE', claimed: false },
  ];

  return (
    <Screen>
      <View style={{ backgroundColor: C.lavender, borderRadius: 24, padding: 22, marginBottom: 18 }}>
        <Text
          style={{
            fontSize: 10,
            color: C.lavenderInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            opacity: 0.55,
            marginBottom: 6,
          }}
        >
          ON YOUR LISTS
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20 }}>
          {[
            { n: '14', l: 'ITEMS' },
            { n: '3', l: 'CLAIMED' },
            { n: '€1.4k', l: 'WORTH' },
          ].map((s) => (
            <View key={s.l}>
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 44,
                  color: C.lavenderInk,
                  lineHeight: 44,
                  letterSpacing: -1.5,
                }}
              >
                {s.n}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: C.lavenderInk,
                  opacity: 0.55,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                  marginTop: 4,
                }}
              >
                {s.l}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
          {filters.map((t, i) => (
            <View
              key={t}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: i === 0 ? C.goldSoft : C.card,
              }}
            >
              <Text
                style={{
                  color: i === 0 ? C.gold : C.mist,
                  fontSize: 10,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                }}
              >
                {t}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {items.map((it, i) => (
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
            opacity: it.claimed ? 0.5 : 1,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: C.lavenderInk,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="gift" size={16} color={C.lavender} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 14,
                color: C.bone,
                letterSpacing: -0.2,
                textDecorationLine: it.claimed ? 'line-through' : 'none',
              }}
            >
              {it.t}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: C.fog,
                fontFamily: F.bodyBold,
                marginTop: 3,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {it.who === 'both' ? 'SHARED' : it.who} · {it.tag}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.displayBold, fontSize: 14, color: C.bone }}>{it.price}</Text>
            {it.claimed && (
              <Text
                style={{
                  fontSize: 9,
                  color: C.mint,
                  fontFamily: F.bodyBold,
                  letterSpacing: 1,
                  marginTop: 2,
                }}
              >
                CLAIMED
              </Text>
            )}
          </View>
        </View>
      ))}
    </Screen>
  );
}
