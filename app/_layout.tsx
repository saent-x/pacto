import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import {
  BitcountPropSingle_400Regular,
  BitcountPropSingle_500Medium,
  BitcountPropSingle_700Bold,
} from '@expo-google-fonts/bitcount-prop-single';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as WebBrowser from 'expo-web-browser';
import { HeaderLeft } from '@/src/components/ui/HeaderLeft';
import { HeroPactoBadge } from '@/src/components/ui/pacto';
import { ThemeProvider, useTheme } from '@/src/lib/theme';
import { SessionProvider } from '@/src/lib/session';
import { SessionGate } from '@/src/lib/session-gate';
import { PushBootstrap } from '@/src/lib/push-bootstrap';
import { ErrorBoundary } from '@/src/lib/error-boundary';
import { AssistantOverlayProvider } from '@/src/lib/assistant-overlay';
import { SessionAiAssistantProvider } from '@/src/lib/ai/sessionProvider';

WebBrowser.maybeCompleteAuthSession();

// 'fitToContents' makes the native iOS sheet size to its content.
// Falls back gracefully on Android via expo-router.
const SHEET_DETENTS = 'fitToContents' as const;
const SHEET_INITIAL_DETENT_INDEX = 0;

export default function RootLayout() {
  const [loaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
    BitcountPropSingle_400Regular,
    BitcountPropSingle_500Medium,
    BitcountPropSingle_700Bold,
  });

  // Hold the entire tree until fonts are ready. Without this, components
  // render once with system fallback fonts and a second time after
  // `loaded` flips — on iOS/RN-Web some Text nodes keep the cached
  // fallback metrics and never swap to the pixel font without a remount.
  if (!loaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <SessionProvider>
                <SessionAiAssistantProvider>
                  <AssistantOverlayProvider>
                    <PushBootstrap />
                    <SessionGate>
                      <ThemedRoot />
                      <FloatingPactoLauncher />
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

function FloatingPactoLauncher() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  if (!shouldShowFloatingPactoLauncher(segments)) return null;

  return (
    <View
      style={{
        position: 'absolute',
        right: 18,
        bottom: insets.bottom + 72,
        zIndex: 50,
        pointerEvents: 'box-none',
      }}
    >
      <HeroPactoBadge
        size={42}
        markSize={38}
      />
    </View>
  );
}

export function shouldShowFloatingPactoLauncher(segments: readonly string[]) {
  if (segments.length === 0) return false;
  if (segments[0] === '(auth)') return false;
  if (segments[0] === 'sheets') return false;
  if (segments[0] === 'notifications') return false;
  return !segments.some((segment) => segment.startsWith('onboarding'));
}

function ThemedRoot() {
  const { C, mode } = useTheme();
  const sheetRouteOptions = {
    presentation: 'formSheet' as const,
    headerShown: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    sheetAllowedDetents: SHEET_DETENTS,
    sheetInitialDetentIndex: SHEET_INITIAL_DETENT_INDEX,
    sheetExpandsWhenScrolledToEdge: true,
    contentStyle: { backgroundColor: C.bg },
  };

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
            headerBackButtonDisplayMode: 'minimal',
            headerLeft: () => <HeaderLeft mode="back" />,
            title: '',
            headerTitleAlign: 'center',
            contentStyle: { backgroundColor: C.bg },
          }}
        />
        <Stack.Screen
          name="sheets/new-reminder"
          options={sheetRouteOptions}
        />
        <Stack.Screen
          name="sheets/new-list"
          options={sheetRouteOptions}
        />
        {[
          'sheets/new-checkin',
          'sheets/new-plan',
          'sheets/new-task',
          'sheets/profile',
          'sheets/rings-history',
          'sheets/new-timetable',
          'sheets/new-timetable-item',
          'sheets/memory-composer',
          'sheets/memory-attach-entity',
          'sheets/upgrade',
          'sheets/account',
          'sheets/journal-entry',
          'sheets/new-entry',
        ].map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={sheetRouteOptions}
          />
        ))}
      </Stack>
    </>
  );
}
