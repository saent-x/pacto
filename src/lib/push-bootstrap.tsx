import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { registerPushToken, touchDeviceLastSeen } from './notifications';
import { useSession } from './session';

/**
 * Headless component: registers Expo push token once the session is ready,
 * refreshes lastSeenAt on foreground, and routes to deep links from
 * tapped notifications.
 */
export function PushBootstrap() {
  const { status, user } = useSession();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || !user?.id) return;
    let cancelled = false;
    registerPushToken(user.id).then((token) => {
      if (cancelled) return;
      tokenRef.current = token;
    });
    return () => {
      cancelled = true;
    };
  }, [status, user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && tokenRef.current) {
        touchDeviceLastSeen(tokenRef.current);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { route?: string }
        | undefined;
      if (data?.route) {
        try {
          router.push(data.route as any);
        } catch {
          /* ignore bad routes */
        }
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}
