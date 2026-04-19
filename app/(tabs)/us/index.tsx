import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';

type ColorKey = 'rose' | 'butter' | 'mint' | 'lavender' | 'peach' | 'sky';

type Feature = {
  key: string;
  href: string;
  label: string;
  sub: string;
  count: string;
  icon: IconName;
  color: ColorKey;
};

const QUOTES = [
  { t: "Morning sunshine. Coffee's on, your socks are in the dryer.", from: 'Sofia', time: '7:14 AM' },
  { t: 'The way you sang along to Caetano last night.', from: 'Sofia', time: 'Wed' },
  { t: 'Thinking about Venice already.', from: 'You', time: 'Wed' },
];

export default function UsEditorial() {
  const { C, F } = useTheme();

  const features: Feature[] = [
    { key: 'notes', href: '/us/notes', label: 'Love notes', sub: '2 new', count: '124', icon: 'heart', color: 'rose' },
    { key: 'checkins', href: '/us/checkins', label: 'Check-ins', sub: 'You · good', count: '86%', icon: 'sun', color: 'butter' },
    { key: 'expenses', href: '/us/expenses', label: 'Expenses', sub: 'Sofia owes €42', count: '€524', icon: 'dollarSign', color: 'mint' },
    { key: 'wishlists', href: '/us/wishlists', label: 'Wishlists', sub: '6 items', count: '14', icon: 'gift', color: 'lavender' },
    { key: 'milestones', href: '/us/milestones', label: 'Milestones', sub: '3 yrs Fri', count: '3d', icon: 'flag', color: 'peach' },
    { key: 'plans', href: '/us/plans', label: 'Plans', sub: 'Venice · 3d', count: '2', icon: 'map', color: 'sky' },
    { key: 'timetables', href: '/us/timetables', label: 'Timetables', sub: '4 rhythms', count: '4', icon: 'calendar', color: 'peach' },
    { key: 'journal', href: '/us/journal', label: 'Journal', sub: '4 entries', count: '184', icon: 'feather', color: 'butter' },
  ];

  return (
    <Screen>
      {/* Date pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginBottom: 18,
          alignSelf: 'center',
        }}
      >
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold }} />
        <Text
          style={{
            fontSize: 10,
            fontFamily: F.bodyBold,
            letterSpacing: 1.2,
            color: C.mist,
            textTransform: 'uppercase',
          }}
        >
          THU · 17 · 11 · MATTIA × SOFIA
        </Text>
      </View>

      {/* Mood strip */}
      <Text
        style={{
          fontSize: 10,
          color: C.fog,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          marginBottom: 10,
        }}
      >
        MOOD · TODAY
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <MoodSlab
          label="YOU"
          mood="Good"
          sub="7h sleep · calm"
          bg={C.peach}
          ink={C.peachInk}
          bars={[1, 1, 0.7, 1, 0.4]}
        />
        <MoodSlab
          label="SOFIA"
          mood="Bright"
          sub="Just finished yoga"
          bg={C.lavender}
          ink={C.lavenderInk}
          bars={[0.5, 1, 1, 1, 0.7]}
        />
      </View>
      <Text
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: C.gold,
          fontFamily: F.bodyBold,
          letterSpacing: 1.2,
          marginBottom: 18,
        }}
      >
        ◇ 86% IN SYNC · 4-DAY STREAK
      </Text>

      {/* Quote */}
      <View
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 22,
          paddingVertical: 22,
          paddingHorizontal: 24,
          marginBottom: 18,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            top: 4,
            right: 12,
            fontFamily: F.serif,
            fontSize: 84,
            color: C.gold,
            opacity: 0.3,
          }}
        >
          "
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            marginBottom: 10,
          }}
        >
          NOTE OF THE DAY · FROM SOFIA · 7:14 AM
        </Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 17,
            color: C.bone,
            lineHeight: 24,
          }}
        >
          Morning sunshine. Coffee's on, your socks are in the dryer. I love our Thursdays.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 6 }}>
          {QUOTES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === 0 ? 20 : 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: i === 0 ? C.gold : C.line,
              }}
            />
          ))}
        </View>
      </View>

      {/* Countdown */}
      <Pressable
        onPress={() => router.push('/us/milestones')}
        style={{
          backgroundColor: C.peach,
          borderRadius: 22,
          paddingVertical: 20,
          paddingHorizontal: 22,
          marginBottom: 22,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            right: -10,
            top: -30,
            fontFamily: F.displayBold,
            fontSize: 170,
            color: C.peachInk,
            opacity: 0.08,
            letterSpacing: -6,
          }}
        >
          03
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: C.peachInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            opacity: 0.55,
          }}
        >
          COUNTDOWN · FRIDAY
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 64,
              color: C.peachInk,
              letterSpacing: -2.2,
              lineHeight: 64,
            }}
          >
            3
          </Text>
          <View>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 20,
                color: C.peachInk,
                letterSpacing: -0.5,
              }}
            >
              days until
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: C.peachInk,
                opacity: 0.7,
                fontFamily: F.serif,
                fontStyle: 'italic',
                marginTop: 2,
              }}
            >
              3rd anniversary
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Shared spaces header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
          }}
        >
          OUR SHARED SPACES · {features.length}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: C.gold,
            fontFamily: F.bodyBold,
            letterSpacing: 1,
          }}
        >
          EDIT →
        </Text>
      </View>

      {/* Asymmetric grid: 1 big + 2 small */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1.3 }}>
          <FeatureCard f={features[0]} variant="big" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <FeatureCard f={features[1]} variant="flat" />
          <FeatureCard f={features[2]} variant="flat" />
        </View>
      </View>

      {/* Medium row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[3]} />
        </View>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[4]} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[5]} />
        </View>
        <View style={{ flex: 1 }}>
          <FeatureCard f={features[6]} />
        </View>
      </View>

      {features[7] && (
        <View style={{ marginBottom: 10 }}>
          <FeatureCard f={features[7]} variant="wide" />
        </View>
      )}

      {/* On this day */}
      <View
        style={{
          backgroundColor: C.rose,
          borderRadius: 20,
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginTop: 12,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            backgroundColor: C.roseInk,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 20,
              color: C.rose,
              letterSpacing: -0.5,
            }}
          >
            '24
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              color: C.roseInk,
              opacity: 0.55,
            }}
          >
            ON THIS DAY · ONE YEAR AGO
          </Text>
          <Text
            style={{
              fontFamily: F.serif,
              fontStyle: 'italic',
              fontSize: 14,
              color: C.roseInk,
              lineHeight: 20,
              marginTop: 3,
            }}
          >
            "First morning in the new place. Kitchen smells like cardboard and coffee."
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function MoodSlab({
  label,
  mood,
  sub,
  bg,
  ink,
  bars,
}: {
  label: string;
  mood: string;
  sub: string;
  bg: string;
  ink: string;
  bars: number[];
}) {
  const { F } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 22,
        padding: 16,
        height: 148,
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          color: ink,
          opacity: 0.55,
        }}
      >
        {label}
      </Text>
      <View>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: 38,
            color: ink,
            letterSpacing: -1,
            lineHeight: 38,
          }}
        >
          {mood}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: ink,
            opacity: 0.65,
            fontFamily: F.body,
            marginTop: 4,
          }}
        >
          {sub}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {bars.map((o, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 4, backgroundColor: ink, opacity: o, borderRadius: 2 }}
          />
        ))}
      </View>
    </View>
  );
}

function FeatureCard({
  f,
  variant,
}: {
  f: Feature;
  variant?: 'big' | 'flat' | 'wide';
}) {
  const { C, F } = useTheme();
  const bg = C[f.color] as string;
  const inkKey = (`${f.color}Ink` as const) as keyof typeof C;
  const ink = C[inkKey] as string;
  const big = variant === 'big';
  const flat = variant === 'flat';
  const padding = flat ? 14 : 16;
  const minH = big ? 200 : flat ? 0 : 120;

  return (
    <Pressable
      onPress={() => router.push(f.href as any)}
      style={{
        backgroundColor: bg,
        borderRadius: 18,
        padding: padding,
        minHeight: minH,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {big && (
        <Text
          style={{
            position: 'absolute',
            right: -10,
            bottom: -30,
            fontFamily: F.displayBold,
            fontSize: 130,
            color: ink,
            opacity: 0.08,
            letterSpacing: -4,
          }}
        >
          {f.count}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            width: flat ? 26 : 32,
            height: flat ? 26 : 32,
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={f.icon} size={flat ? 13 : 15} color={ink} />
        </View>
        {!flat && !big && (
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 14,
              color: ink,
              letterSpacing: -0.3,
              opacity: 0.9,
            }}
          >
            {f.count}
          </Text>
        )}
      </View>
      <View style={{ marginTop: flat ? 8 : big ? 20 : 14 }}>
        <Text
          style={{
            fontFamily: F.displayBold,
            fontSize: big ? 24 : flat ? 14 : 16,
            color: ink,
            letterSpacing: -0.4,
            lineHeight: big ? 24 : flat ? 14 : 16,
          }}
        >
          {f.label}
        </Text>
        <Text
          style={{
            fontSize: flat ? 10 : 11,
            color: ink,
            opacity: 0.6,
            fontFamily: F.body,
            marginTop: 3,
          }}
        >
          {f.sub}
        </Text>
      </View>
    </Pressable>
  );
}
