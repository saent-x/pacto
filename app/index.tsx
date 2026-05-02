import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PactoMark } from '@/src/components/ui/pacto';
import { Typography } from '@/src/constants/typography';
import { useSession } from '@/src/lib/session';
import { useTheme } from '@/src/lib/theme';

export default function Index() {
  const router = useRouter();
  const { status } = useSession();
  const { C } = useTheme();

  useEffect(() => {
    if (status === 'unauthed') router.replace('/(auth)/sign-in' as any);
    else if (status === 'onboarding') router.replace('/(auth)/onboarding' as any);
    else if (status === 'ready') router.replace('/(tabs)/home' as any);
  }, [status, router]);

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      testID="boot-screen"
      style={{
        flex: 1,
        backgroundColor: C.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
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
        pacto<Text style={{ color: C.accent }}>.</Text>
      </Text>
      <View style={{ marginTop: 22 }} testID="boot-status">
        <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>
          BOOTING · {status}
        </Text>
      </View>
    </Animated.View>
  );
}
