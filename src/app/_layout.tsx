import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { convex, secureStorage } from '@/lib/convex';
import { ThemeProvider, useTheme } from '@/theme';
import { SpaceProvider, useSpace } from '@/features/account/SpaceProvider';
import { AIControllerProvider } from '@/features/ai/AIController';
import { useRegisterPushNotifications } from '@/features/notifications/useNotifications';
import { setPendingInvite, getPendingInvite, clearPendingInvite, parseJoinCode } from '@/lib/pendingInvite';

// Registers this device for push + handles notification taps. Rendered only
// when signed in and past onboarding so hooks run unconditionally inside it.
function PushRegistrar() {
  useRegisterPushNotifications();
  return null;
}

SplashScreen.preventAutoHideAsync();

function RootNav() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { fontsLoaded, C, isDark } = useTheme();
  const space = useSpace();
  const router = useRouter();

  const spaceResolved = !isAuthenticated || !space.loading;
  const ready = fontsLoaded && !isLoading && spaceResolved;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const needsOnboarding = isAuthenticated && space.space === null;

  // Capture pacto://join/<code> deep links (even while signed out) so the code
  // survives until the user can redeem it.
  useEffect(() => {
    const handle = (url: string | null) => {
      const code = parseJoinCode(url);
      if (code) setPendingInvite(code);
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  // Once authenticated and past onboarding, redeem any pending invite.
  useEffect(() => {
    if (!ready || !isAuthenticated || needsOnboarding) return;
    getPendingInvite().then((code) => {
      if (code) {
        clearPendingInvite();
        router.push(`/join/${code}`);
      }
    });
  }, [ready, isAuthenticated, needsOnboarding, router]);

  if (!ready) return null;

  return (
    <AIControllerProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isAuthenticated && !needsOnboarding && <PushRegistrar />}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && needsOnboarding}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && !needsOnboarding}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join/[code]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="tasks" />
          <Stack.Screen name="checkins" />
          <Stack.Screen name="timetable" />
          <Stack.Screen name="timetable/[id]" />
          <Stack.Screen name="reminders" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="spaces" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="profile" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="new/task" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="new/event" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="new/reminder" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="new/checkin" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="new/timetable" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="new/timetable-step" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', contentStyle: { backgroundColor: C.surface } }} />
          <Stack.Screen name="new/space" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </AIControllerProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ConvexAuthProvider client={convex} storage={secureStorage}>
          <ThemeProvider>
            <SpaceProvider>
              <RootNav />
            </SpaceProvider>
          </ThemeProvider>
        </ConvexAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
