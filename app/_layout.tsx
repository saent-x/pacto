import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from '@expo-google-fonts/geist-mono';
import {
  PixelifySans_400Regular,
  PixelifySans_500Medium,
  PixelifySans_700Bold,
} from '@expo-google-fonts/pixelify-sans';
import {
  Silkscreen_400Regular,
  Silkscreen_700Bold,
} from '@expo-google-fonts/silkscreen';
import {
  BitcountPropSingle_400Regular,
  BitcountPropSingle_500Medium,
  BitcountPropSingle_700Bold,
} from '@expo-google-fonts/bitcount-prop-single';
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
import { PushBootstrap } from '@/src/lib/push-bootstrap';
import { ErrorBoundary } from '@/src/lib/error-boundary';
import { AssistantOverlayProvider } from '@/src/lib/assistant-overlay';
import { SessionAiAssistantProvider } from '@/src/lib/ai/sessionProvider';

WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    PixelifySans_400Regular,
    PixelifySans_500Medium,
    PixelifySans_700Bold,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    BitcountPropSingle_400Regular,
    BitcountPropSingle_500Medium,
    BitcountPropSingle_700Bold,
  });

  // Hold the native splash until fonts have loaded — otherwise the splash
  // hides almost immediately and the brand mark flashes by. With a minimum
  // visible window the user actually sees pacto branding on cold start.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0E0B0A' }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <SessionProvider>
                <SessionAiAssistantProvider>
                  <AssistantOverlayProvider>
                    <PushBootstrap />
                    <SessionGate>
                      <ThemedRoot />
                    </SessionGate>
                  </AssistantOverlayProvider>
                </SessionAiAssistantProvider>
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
            headerTintColor: C.inkColor,
            headerBackTitle: '',
            title: '',
            headerTitleAlign: 'center',
            contentStyle: { backgroundColor: C.bg },
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
          'sheets/currency',
          'sheets/journal-entry',
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
