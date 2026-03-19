import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { supabase } from '@/src/lib/supabase';
import { ThemeProvider, useTheme } from '@/src/lib/theme';
import { useAuthStore } from '@/src/stores/authStore';
import { useCoupleStore } from '@/src/stores/coupleStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { session, profile, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentRoute = segments.join('/');

    if (!session) {
      // Not signed in → go to sign-in (unless already there)
      if (!currentRoute.includes('sign-in') && !currentRoute.includes('sign-up')) {
        router.replace('/(auth)/sign-in');
      }
    } else if (!profile?.couple_id) {
      // Signed in but no couple → go to onboarding (unless already on onboarding/invite)
      if (!currentRoute.includes('onboarding') && !currentRoute.includes('invite')) {
        router.replace('/(auth)/onboarding');
      }
    } else {
      // Signed in with couple → go to home
      if (inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, profile, isLoading, segments]);
}

export default function RootLayout() {
  const { setSession, fetchProfile, profile } = useAuthStore();
  const { fetchCouple, fetchPartner } = useCoupleStore();
  const [appReady, setAppReady] = useState(false);
  const appReadyRef = useRef(false);

  const markReady = () => {
    if (!appReadyRef.current) {
      appReadyRef.current = true;
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  };

  useEffect(() => {
    // 1. Check for existing session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Coupl] Initial session:', session ? 'found' : 'none');
      setSession(session);
      if (session?.user) {
        await useAuthStore.getState().fetchProfile();
      }
      markReady();
    }).catch(() => {
      console.log('[Coupl] getSession failed, proceeding without session');
      setSession(null);
      markReady();
    });

    // 2. Listen for future auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Coupl] Auth event:', event);
        setSession(session);
        if (session?.user) {
          await useAuthStore.getState().fetchProfile();
        }
        markReady();
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // When profile loads with a couple_id, fetch couple data
  useEffect(() => {
    if (profile?.couple_id) {
      fetchCouple(profile.couple_id);
      if (profile.id) {
        fetchPartner(profile.couple_id, profile.id);
      }
    }
  }, [profile?.couple_id]);

  useProtectedRoute();

  if (!appReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={styles.container}>
        <BottomSheetModalProvider>
          <StatusBarWrapper />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
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
