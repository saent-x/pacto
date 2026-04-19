import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AddBtn } from '@/src/components/ui/AddBtn';
import { Screen } from '@/src/components/ui/Screen';
import { SubHeader } from '@/src/components/ui/SubHeader';
import { useTheme } from '@/src/lib/theme';

export default function Milestones() {
  const { C, F } = useTheme();
  const stones = [
    { y: '2026', m: 'APR 18', t: '3 years', sub: 'Anniversary', color: C.peach, ink: C.peachInk, fut: true },
    { y: '2025', m: 'DEC 24', t: 'First Christmas alone', sub: 'Gnocchi. Candles. Just us.', color: C.rose, ink: C.roseInk, fut: false },
    { y: '2025', m: 'AUG 12', t: 'Moved in — Ostiense', sub: 'The green door. The cat followed.', color: C.mint, ink: C.mintInk, fut: false },
    { y: '2024', m: 'MAY 03', t: 'First trip · Puglia', sub: 'Got lost finding orecchiette.', color: C.sky, ink: C.skyInk, fut: false },
    { y: '2023', m: 'APR 18', t: 'First date', sub: 'You wore the red scarf.', color: C.butter, ink: C.butterInk, fut: false },
  ];

  return (
    <Screen>
      <View
        style={{
          backgroundColor: C.peach,
          borderRadius: 26,
          padding: 22,
          marginBottom: 22,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            fontFamily: F.displayBold,
            fontSize: 140,
            color: 'rgba(0,0,0,0.06)',
            letterSpacing: -4,
          }}
        >
          3
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: C.peachInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            opacity: 0.55,
            marginBottom: 8,
          }}
        >
          NEXT · IN 1 DAY
        </Text>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 32,
            color: C.peachInk,
            letterSpacing: -1,
            lineHeight: 34,
          }}
        >
          Three{'\n'}years.
        </Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 13,
            color: C.peachInk,
            opacity: 0.7,
            marginTop: 10,
            maxWidth: 240,
          }}
        >
          "And somehow, it still feels like the first week." — Sofia, journal
        </Text>
      </View>

      {stones.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
          <View style={{ width: 50, alignItems: 'flex-end', paddingTop: 16 }}>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 18,
                color: C.bone,
                letterSpacing: -0.4,
                lineHeight: 18,
              }}
            >
              {s.y}
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: C.fog,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
                marginTop: 3,
              }}
            >
              {s.m}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: s.color,
              borderRadius: 18,
              padding: 16,
              opacity: s.fut ? 0.55 : 1,
              borderWidth: s.fut ? 1.5 : 0,
              borderStyle: 'dashed',
              borderColor: 'rgba(0,0,0,0.3)',
            }}
          >
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 17,
                color: s.ink,
                letterSpacing: -0.3,
                lineHeight: 19,
              }}
            >
              {s.t}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: s.ink,
                opacity: 0.65,
                fontFamily: F.body,
                marginTop: 3,
              }}
            >
              {s.sub}
            </Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}
