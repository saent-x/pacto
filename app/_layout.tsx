import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as WebBrowser from 'expo-web-browser';
import { ThemeProvider, useTheme } from '@/src/lib/theme';
import { SessionProvider } from '@/src/lib/session';
import { SessionGate } from '@/src/lib/session-gate';
import { ErrorBoundary } from '@/src/lib/error-boundary';

WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  // Hide splash on mount regardless of font state. Fonts will pop in when ready.
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0E0B0A' }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <SessionProvider>
                <SessionGate>
                  <ThemedRoot />
                </SessionGate>
              </SessionProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function ThemedRoot() {
  const { C, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.ink },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerShadowVisible: false,
            headerBackground: () => null,
            headerTintColor: C.bone,
            headerBackTitle: '',
            title: 'Notifications',
            headerTitleAlign: 'center',
            contentStyle: { backgroundColor: C.ink },
          }}
        />
        <Stack.Screen
          name="sheets/new-reminder"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            sheetAllowedDetents: 'fitToContents',
            contentStyle: { backgroundColor: C.coal },
          }}
        />
        <Stack.Screen
          name="sheets/new-entry"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            sheetAllowedDetents: 'fitToContents',
            contentStyle: { backgroundColor: C.coal },
          }}
        />
        <Stack.Screen
          name="sheets/new-list"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            sheetAllowedDetents: 'fitToContents',
            contentStyle: { backgroundColor: C.coal },
          }}
        />
        {[
          'sheets/new-note',
          'sheets/new-checkin',
          'sheets/new-expense',
          'sheets/new-wish',
          'sheets/new-milestone',
          'sheets/new-plan',
          'sheets/new-task',
          'sheets/profile',
          'sheets/rings-history',
          'sheets/new-timetable',
          'sheets/new-timetable-item',
        ].map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              sheetAllowedDetents: 'fitToContents',
              contentStyle: { backgroundColor: C.coal },
            }}
          />
        ))}
      </Stack>
    </>
  );
}
