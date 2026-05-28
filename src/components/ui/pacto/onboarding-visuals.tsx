import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AvatarPair, Card, CrewStack, PactoMark } from '@/src/components/ui/pacto';
import { Typography } from '@/src/constants/typography';
import { DEFAULT_AVATARS } from '@/src/constants/defaultAvatars';
import { useTheme } from '@/src/lib/theme';
import type { OnboardingVisual } from '@/src/lib/onboarding';

function PactVisual() {
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

function CrewVisual() {
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

function HomeVisual() {
  const { C } = useTheme();
  const rows = [C.accent, C.accent2, C.accent3];
  return (
    <View style={{ width: 240, gap: 12 }}>
      {rows.map((dot, i) => (
        <Animated.View key={i} entering={FadeInDown.duration(560).delay(80 + i * 110)}>
          <View
            style={[styles.rhythmRow, { backgroundColor: C.bgCard, borderColor: C.lineColor }]}
          >
            <View style={[styles.rhythmDot, { backgroundColor: dot }]} />
            <View style={{ flex: 1, gap: 7 }}>
              <View
                style={[styles.rhythmBar, { width: '72%', backgroundColor: C.line2 }]}
              />
              <View
                style={[styles.rhythmBar, { width: '46%', height: 6, backgroundColor: C.lineColor }]}
              />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function MemoriesVisual() {
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

export const VISUALS: Record<OnboardingVisual, React.ComponentType> = {
  pact: PactVisual,
  crew: CrewVisual,
  home: HomeVisual,
  memories: MemoriesVisual,
};

const styles = StyleSheet.create({
  rhythmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rhythmDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rhythmBar: {
    height: 8,
    borderRadius: 4,
  },
});
