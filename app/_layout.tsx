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
} from '@expo-google-fonts/newsreader';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useColors } from '@/src/hooks/useColors';
import { AppProviders } from '@/src/providers/AppProviders';
import { AppSplash } from '@/src/components/ui/AppSplash';

export { ErrorBoundary } from 'expo-router';

// Hide the native splash immediately — AppSplash takes over.
SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const segments = useSegments() as string[];
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

    // Let the onboarding "created" step (invite-code screen) stay visible
    // even after the couple exists — the user navigates away manually.
    const onOnboardingScreen = inAuthGroup && authScreen === 'onboarding';

    if (!inTabsGroup && !onOnboardingScreen) {
      router.replace(route);
    }
  }, [activeCouple, isAuthenticated, isLoading, route, router, segments]);
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isLoading, route } = useSession();
  const C = useColors();
  const hasInitialized = useRef(false);

  useProtectedRoute();

  // App is ready when fonts + auth + route are all resolved.
  const appReady = fontsLoaded && !isLoading && !!route;

  if (appReady) {
    hasInitialized.current = true;
  }

  // Dismiss native splash on very first render so AppSplash is visible.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Show AppSplash until everything is ready. Uses system fonts so it
  // renders instantly — no dependency on custom font loading.
  if (!hasInitialized.current) {
    return <AppSplash />;
  }

  return (
    <>
      <StatusBarWrapper />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.screenBackground },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Newsreader_300Light_Italic,
    Newsreader_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <AppProviders>
        <RootNavigator fontsLoaded={fontsLoaded} />
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
    backgroundColor: '#0F0D0B',
  },
});
