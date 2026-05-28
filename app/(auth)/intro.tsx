import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  AvatarPair,
  Card,
  CrewStack,
  HeaderBrand,
  PactoMark,
} from '@/src/components/ui/pacto';
import { PulsingDot } from '@/src/components/ui/pacto/PulsingDot';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { DEFAULT_AVATARS } from '@/src/constants/defaultAvatars';
import { INTRO_SEEN_KEY } from '@/src/lib/intro';
import { useTheme } from '@/src/lib/theme';

const PAGE_COUNT = 3;

export default function Intro() {
  const router = useRouter();
  const { C } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const { width } = Dimensions.get('window');

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {}
    router.replace('/(auth)/sign-in' as any);
  }, [router]);

  const goNext = useCallback(() => {
    if (index >= PAGE_COUNT - 1) {
      finish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }, [index, width, finish]);

  const onMomentum = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const isLast = index === PAGE_COUNT - 1;

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <View style={{ width: 64 }} />
        <Dots count={PAGE_COUNT} active={index} />
        {isLast ? (
          <View style={{ width: 64 }} />
        ) : (
          <PressScale
            testID="intro-skip"
            onPress={finish}
            accessibilityLabel="Skip intro"
            style={styles.skip}
          >
            <Text style={[Typography.captionMedium, { color: C.ink2 }]}>Skip</Text>
          </PressScale>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentum}
        scrollEventThrottle={16}
        bounces={false}
      >
        <Page
          active={index === 0}
          width={width}
          eyebrow="MAKE IT STICK"
          title="small pacts."
          body="Turn quiet promises into something you and your people actually keep."
          accent={C.accent}
          visual={<PactBubble />}
        />
        <Page
          active={index === 1}
          width={width}
          eyebrow="YOUR PEOPLE"
          title="in sync."
          body="Bring a partner, a roommate, or a small crew into one shared rhythm."
          accent={C.accent2}
          visual={<CrewBubble />}
        />
        <Page
          active={index === 2}
          width={width}
          eyebrow="REMEMBER WHY"
          title="moments."
          body="Capture wins, routines, and the small things that made it worth it."
          accent={C.accent3}
          visual={<MomentsBubble />}
        />
      </ScrollView>

      <View style={styles.footer}>
        <PressScale
          testID="intro-next"
          onPress={goNext}
          accessibilityLabel={isLast ? 'Get started' : 'Next intro screen'}
          style={[styles.cta, { backgroundColor: C.accent }]}
          haptic="selection"
        >
          <Text style={[Typography.bodyMedium, { color: C.bg }]}>
            {isLast ? 'Get started' : 'Next'}
          </Text>
          <Icon name="arrowRight" size={16} color={C.bg} />
        </PressScale>
      </View>
    </View>
  );
}

function Page({
  active,
  width,
  eyebrow,
  title,
  body,
  accent,
  visual,
}: {
  active: boolean;
  width: number;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  visual: React.ReactNode;
}) {
  const { C } = useTheme();
  return (
    <View style={[styles.page, { width }]}>
      {active ? (
        <>
          <Animated.View
            key={`visual-${eyebrow}`}
            entering={FadeIn.duration(520).easing(Easing.out(Easing.cubic))}
            style={styles.visual}
          >
            {visual}
          </Animated.View>
          <Animated.View
            key={`copy-${eyebrow}`}
            entering={FadeInUp.duration(520).delay(120).easing(Easing.out(Easing.cubic))}
            style={styles.copy}
          >
            <HeaderBrand eyebrow={eyebrow} title={title} size={36} />
            <View style={{ position: 'absolute', right: -2, top: 22 }}>
              <Text style={[{ fontFamily: Typography.pixelFont, fontSize: 36, color: accent }]}>
                <PulsingDot color={accent} />
              </Text>
            </View>
            <Text
              style={[
                Typography.body,
                { color: C.ink2, marginTop: 16, textAlign: 'center', maxWidth: 300 },
              ]}
            >
              {body}
            </Text>
          </Animated.View>
        </>
      ) : (
        <View style={[styles.visual, { opacity: 0 }]}>{visual}</View>
      )}
    </View>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  const { C } = useTheme();
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === active ? C.inkColor : C.line2,
              width: i === active ? 18 : 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

function PactBubble() {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [float]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  return (
    <Animated.View style={style}>
      <PactoMark size={128} />
    </Animated.View>
  );
}

function CrewBubble() {
  const { C } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Animated.View entering={FadeInDown.duration(620).delay(80)}>
        <AvatarPair
          a={{ avatarUrl: DEFAULT_AVATARS[1].id, color: C.accent }}
          b={{ avatarUrl: DEFAULT_AVATARS[2].id, color: C.accent2 }}
          size={84}
        />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(620).delay(220)}>
        <CrewStack size={44} />
      </Animated.View>
    </View>
  );
}

function MomentsBubble() {
  const { C } = useTheme();
  const tilts = [-6, 3, -2];
  return (
    <View style={{ height: 160, width: 220, alignItems: 'center', justifyContent: 'center' }}>
      {tilts.map((deg, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.duration(520).delay(100 + i * 120)}
          style={{
            position: 'absolute',
            transform: [{ rotate: `${deg}deg` }, { translateX: (i - 1) * 22 }],
          }}
        >
          <Card
            style={{
              width: 120,
              height: 140,
              backgroundColor: C.bgCard,
              borderColor: C.lineColor,
              padding: 10,
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                right: 10,
                bottom: 36,
                backgroundColor: [C.accent, C.accent2, C.accent3][i],
                opacity: 0.18,
                borderRadius: 4,
              }}
            />
            <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
              {['MAY 02', 'JUN 14', 'TODAY'][i]}
            </Text>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  skip: {
    width: 64,
    alignItems: 'flex-end',
    paddingVertical: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  page: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visual: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  copy: {
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  cta: {
    minHeight: 52,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
