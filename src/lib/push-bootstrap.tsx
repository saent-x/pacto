import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import {
  addNotificationResponseRouteListener,
  registerPushToken,
  touchDeviceLastSeen,
} from './notifications';
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
      if (next === 'active' && tokenRef.current && user?.id) {
        touchDeviceLastSeen(tokenRef.current, user.id);
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    let sub: { remove: () => void } | null = null;

    addNotificationResponseRouteListener((route) => {
      if (!cancelled) {
        try {
          router.push(route as any);
        } catch {
          /* ignore bad routes */
        }
      }
    }).then((listener) => {
      if (cancelled) {
        listener?.remove();
        return;
      }
      sub = listener;
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return null;
}
