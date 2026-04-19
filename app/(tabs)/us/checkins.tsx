import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AddBtn } from '@/src/components/ui/AddBtn';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { SubHeader } from '@/src/components/ui/SubHeader';
import { useTheme } from '@/src/lib/theme';

export default function Checkins() {
  const { C, F } = useTheme();
  const moods: IconName[] = ['sun', 'cloud', 'minus', 'cloudRain', 'zap'];
  const week: { day: string; me: number | null; them: number | null }[] = [
    { day: 'MON', me: 0, them: 1 },
    { day: 'TUE', me: 1, them: 0 },
    { day: 'WED', me: 1, them: 1 },
    { day: 'THU', me: 0, them: 1 },
    { day: 'FRI', me: null, them: null },
    { day: 'SAT', me: null, them: null },
    { day: 'SUN', me: null, them: null },
  ];

  return (
    <Screen>
      <View style={{ backgroundColor: C.butter, borderRadius: 24, padding: 22, marginBottom: 18 }}>
        <Text
          style={{
            fontSize: 10,
            color: C.butterInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            opacity: 0.55,
            marginBottom: 6,
          }}
        >
          THIS WEEK · IN SYNC
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 54,
              color: C.butterInk,
              lineHeight: 50,
              letterSpacing: -2,
            }}
          >
            86<Text style={{ fontSize: 28 }}>%</Text>
          </Text>
          <Text
            style={{
              flex: 1,
              marginBottom: 8,
              fontSize: 12,
              color: C.butterInk,
              opacity: 0.6,
              fontFamily: F.bodyBold,
            }}
          >
            4 of 4 days you've both checked in — a streak.
          </Text>
        </View>
        <View
          style={{
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.12)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <View style={{ width: '86%', height: '100%', backgroundColor: C.butterInk }} />
        </View>
      </View>

      <Text
        style={{
          fontSize: 11,
          color: C.fog,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          paddingLeft: 4,
          marginBottom: 12,
        }}
      >
        THIS WEEK
      </Text>

      <View
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 22,
          padding: 18,
          marginBottom: 22,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.peach }} />
          <Text style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold, letterSpacing: 1 }}>YOU</Text>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: C.lavender,
              marginLeft: 8,
            }}
          />
          <Text style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold, letterSpacing: 1 }}>SOFIA</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((d) => (
            <View key={d.day} style={{ alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  fontSize: 9,
                  color: C.fog,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                {d.day}
              </Text>
              <Cell value={d.me} color={C.peach} ink={C.peachInk} moods={moods} />
              <Cell value={d.them} color={C.lavender} ink={C.lavenderInk} moods={moods} />
            </View>
          ))}
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
        TODAY · NOT CHECKED IN YET
      </Text>
      <Pressable
        style={{
          backgroundColor: C.gold,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: C.peachInk, fontFamily: F.displayBold, fontSize: 15 }}>
          Share how today feels
        </Text>
        <Icon name="arrowRight" size={18} color={C.peachInk} strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
}

function Cell({
  value,
  color,
  ink,
  moods,
}: {
  value: number | null;
  color: string;
  ink: string;
  moods: IconName[];
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: value !== null ? color : 'transparent',
        borderWidth: value === null ? 1.5 : 0,
        borderStyle: 'dashed',
        borderColor: C.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {value !== null && <Icon name={moods[value]} size={12} color={ink} strokeWidth={2.5} />}
    </View>
  );
}
