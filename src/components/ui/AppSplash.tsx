import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const BG = '#0F0D0B';
const GOLD = '#D4A054';
const CREAM = '#E8DDD0';
const FOG = '#7A6E62';

export function AppSplash() {
  const ruleScale = useSharedValue(1);

  useEffect(() => {
    ruleScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [ruleScale]);

  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ruleScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(250)}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.wordmark}>Coupl</Text>
        <Animated.View style={[styles.rule, ruleStyle]} />
      </View>

      <Text style={styles.tagline}>Your quiet place, together.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 52,
    lineHeight: 60,
    letterSpacing: -1.2,
    fontStyle: 'italic',
    color: CREAM,
  },
  rule: {
    width: 28,
    height: 2,
    backgroundColor: GOLD,
    borderRadius: 1,
    marginTop: 16,
  },
  tagline: {
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: FOG,
    position: 'absolute',
    bottom: 64,
  },
});
