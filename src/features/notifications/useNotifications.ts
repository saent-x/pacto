import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMutation, type ConvexReactClient } from 'convex/react';
import { api } from '@cvx/_generated/api';

// Show notifications while the app is foregrounded (banner + sound, no badge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Remember the token registered for this device so the sign-out flow can
// detach it from the current user (see unregisterPushToken).
let lastToken: string | null = null;

// getLastNotificationResponseAsync() is persistent for the whole app process, so
// the cold-start tap is consumed once — otherwise it replays the same navigation
// every time the registrar remounts (e.g. switching spaces).
let coldStartConsumed = false;

function getProjectId(): string | undefined {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
  );
}

async function fetchExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens are unavailable on simulators

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = getProjectId();
  if (!projectId) return null; // EAS project not yet configured

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.warn('Failed to get Expo push token', e);
    return null;
  }
}

/**
 * Registers this device for push, keeps the token fresh on the server, and
 * routes to the relevant screen when a notification is tapped. Mount once,
 * while authenticated and past onboarding.
 */
export function useRegisterPushNotifications() {
  const router = useRouter();
  const register = useMutation(api.notifications.registerPushToken);
  const registeredRef = useRef(false);

  // Register the token (once per mount).
  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;
    let cancelled = false;
    (async () => {
      const token = await fetchExpoPushToken();
      if (!token || cancelled) return;
      lastToken = token;
      try {
        await register({
          token,
          platform: Platform.OS,
          deviceName: Device.deviceName ?? undefined,
        });
      } catch (e) {
        console.warn('Failed to register push token', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [register]);

  // Route to the item when a notification is tapped. The live listener handles
  // taps while the app runs; the cold-start launch response is consumed only once
  // per process (it is persistent and would otherwise re-navigate on remount).
  useEffect(() => {
    const go = (response: Notifications.NotificationResponse | null) => {
      const route = response?.notification.request.content.data?.route;
      if (typeof route === 'string' && route.length > 0) {
        router.push(route as never);
      }
    };
    if (!coldStartConsumed) {
      coldStartConsumed = true;
      Notifications.getLastNotificationResponseAsync().then(go);
    }
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, [router]);
}

/** Detach this device's push token from the current user (call before sign-out). */
export async function unregisterPushToken(convex: ConvexReactClient) {
  if (!lastToken) return;
  try {
    await convex.mutation(api.notifications.removePushToken, { token: lastToken });
  } catch {
    // best-effort
  }
  lastToken = null;
}
