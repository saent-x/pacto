import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CouplRings, Overline } from '@/src/components/ui/atoms';
import { useSession } from '@/src/lib/session';
import { useTheme } from '@/src/lib/theme';

export default function Index() {
  const router = useRouter();
  const { status } = useSession();
  const { C, F } = useTheme();

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
        backgroundColor: C.ink,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Text
        style={{
          marginTop: 20,
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 40,
          color: C.bone,
          letterSpacing: -1,
        }}
      >
        coupl
      </Text>
      <View
        style={{
          width: 28,
          height: 2,
          backgroundColor: C.gold,
          borderRadius: 1,
          marginTop: 14,
        }}
      />
      <View style={{ marginTop: 22 }} testID="boot-status">
        <Overline style={{ color: C.fog }}>BOOTING · {status}</Overline>
      </View>
    </Animated.View>
  );
}
