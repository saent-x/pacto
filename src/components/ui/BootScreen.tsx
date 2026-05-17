import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PactoMark } from '@/src/components/ui/pacto';
import { PulsingDot } from '@/src/components/ui/pacto/PulsingDot';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

type Props = {
  absolute?: boolean;
};

export function BootScreen({ absolute = false }: Props) {
  const { C } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      testID="boot-screen"
      style={[
        styles.root,
        { backgroundColor: C.bg },
        absolute ? styles.absolute : null,
      ]}
    >
      <PactoMark size={64} />
      <Text
        style={{
          marginTop: 18,
          fontFamily: Typography.pixelFont,
          fontSize: 36,
          color: C.inkColor,
          letterSpacing: 0,
        }}
      >
        pacto<PulsingDot color={C.accent} />
      </Text>
      <View style={{ marginTop: 22 }} testID="boot-status">
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
          OPENING YOUR PACT
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  absolute: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'auto',
  },
});
