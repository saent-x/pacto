import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { HeaderBrand } from '@/src/components/ui/pacto';
import { PulsingDot } from '@/src/components/ui/pacto/PulsingDot';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

export type PagerPage = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  visual: React.ReactNode;
};

export function OnboardingPager({
  pages,
  onFinish,
  onSkip,
}: {
  pages: PagerPage[];
  onFinish: () => void;
  onSkip: () => void;
}) {
  const { C } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const { width } = Dimensions.get('window');
  const count = pages.length;
  const isLast = index >= count - 1;

  const goNext = useCallback(() => {
    if (index >= count - 1) {
      onFinish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }, [index, count, width, onFinish]);

  const onMomentum = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.topBar}>
        <View style={{ width: 64 }} />
        <Dots count={count} active={index} />
        {isLast ? (
          <View style={{ width: 64 }} />
        ) : (
          <PressScale
            testID="intro-skip"
            onPress={onSkip}
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
        {pages.map((page, i) => (
          <Page key={page.key} active={index === i} width={width} page={page} />
        ))}
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

function Page({ active, width, page }: { active: boolean; width: number; page: PagerPage }) {
  const { C } = useTheme();
  const { eyebrow, title, body, accent, visual } = page;
  return (
    <View style={[styles.page, { width }]}>
      {active ? (
        <>
          <Animated.View
            key={`visual-${page.key}`}
            entering={FadeIn.duration(520).easing(Easing.out(Easing.cubic))}
            style={styles.visual}
          >
            {visual}
          </Animated.View>
          <Animated.View
            key={`copy-${page.key}`}
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
