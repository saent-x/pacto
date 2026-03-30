import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import {
  Newsreader_300Light_Italic,
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import {
  DMSans_400Regular,
  DMSans_400Regular_Italic,
  DMSans_500Medium,
  DMSans_500Medium_Italic,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_700Bold_Italic,
} from '@expo-google-fonts/dm-sans';

import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { AppProviders } from '@/src/providers/AppProviders';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { activeCouple, isAuthenticated, isLoading, route } = useSession();

  useEffect(() => {
    if (isLoading || !route) {
      return;
    }

    const authScreen = segments[1];
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      const onSignedOutScreen =
        inAuthGroup &&
        (authScreen === 'sign-in' || authScreen === 'sign-up');

      if (!onSignedOutScreen) {
        router.replace(route);
      }
      return;
    }

    if (!activeCouple) {
      const onMembershipScreen =
        inAuthGroup &&
        (authScreen === 'onboarding' || authScreen === 'invite');

      if (!onMembershipScreen) {
        router.replace(route);
      }
      return;
    }

    if (!inTabsGroup) {
      router.replace(route);
    }
  }, [activeCouple, isAuthenticated, isLoading, route, router, segments]);
}

function RootNavigator({
  fontsLoaded,
  markReady,
}: {
  fontsLoaded: boolean;
  markReady: () => void;
}) {
  const { isLoading } = useSession();

  useProtectedRoute();

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      markReady();
    }
  }, [fontsLoaded, isLoading, markReady]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <>
      <StatusBarWrapper />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const appReadyRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Newsreader_300Light_Italic,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    DMSans_400Regular,
    DMSans_400Regular_Italic,
    DMSans_500Medium,
    DMSans_500Medium_Italic,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_700Bold_Italic,
  });

  const markReady = () => {
    if (!appReadyRef.current) {
      appReadyRef.current = true;
      SplashScreen.hideAsync();
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <AppProviders>
        <RootNavigator fontsLoaded={fontsLoaded} markReady={markReady} />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

function StatusBarWrapper() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
