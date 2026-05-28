import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db, id } from './instant';
import { safeNotificationRoute } from './notification-routes';

type ExpoNotifications = typeof import('expo-notifications');
type NotificationSubscription = { remove: () => void };

let notificationsPromise: Promise<ExpoNotifications> | null = null;

async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'web') return null;

  notificationsPromise ??= import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  });

  return notificationsPromise;
}

const idFor = (reminderId: string) => `reminder:${reminderId}`;

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (e) {
    console.warn('[notifications] permission request failed', e);
    return false;
  }
}

export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  dueAtIso: string,
): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  const fireAt = new Date(dueAtIso).getTime();
  if (!Number.isFinite(fireAt) || fireAt <= Date.now()) return null;
  await ensureAndroidChannel(Notifications);
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  const identifier = idFor(reminderId);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: 'Reminder', body: title, data: { reminderId } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(dueAtIso),
    },
  });
  return identifier;
}

export async function cancelReminderNotification(reminderId: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(idFor(reminderId)).catch(() => undefined);
}

// --- Push token registration ---------------------------------------------

function getProjectId(): string | undefined {
  const expo = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expo?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
}

async function getExpoPushToken(Notifications: ExpoNotifications): Promise<string | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] no EAS projectId configured — run `eas init` first');
    return null;
  }

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed', e);
    return null;
  }
}

function linkedUserId(row: any): string | null {
  const user = Array.isArray(row?.user) ? row.user[0] : row?.user;
  return typeof user?.id === 'string' ? user.id : null;
}

async function ensureAndroidChannel(Notifications: ExpoNotifications): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F3EDE2',
  });
}

/**
 * Acquire Expo push token and upsert it into the `devices` entity for this user.
 * Returns the token, or null if running on a simulator / permission denied / no projectId.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  if (!Device.isDevice) return null; // simulators cannot get APNs/FCM tokens
  await ensureAndroidChannel(Notifications);
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const token = await getExpoPushToken(Notifications);
  if (!token) return null;

  try {
    const existing = await (db as any).queryOnce({
      devices: {
        $: { where: { expoPushToken: token } },
        user: {},
      },
    });
    const row = existing?.data?.devices?.[0] ?? null;
    const now = Date.now();
    if (row) {
      const ownerId = linkedUserId(row);
      if (ownerId !== userId) {
        console.warn('[push] push token already belongs to another user; refusing to relink');
        return null;
      }
      await db.transact(
        db.tx.devices[row.id]
          .update({ lastSeenAt: now, appVersion: Constants.expoConfig?.version ?? undefined })
          .link({ user: userId }),
      );
    } else {
      const deviceId = id();
      await db.transact(
        db.tx.devices[deviceId]
          .update({
            expoPushToken: token,
            platform: Platform.OS,
            appVersion: Constants.expoConfig?.version ?? undefined,
            lastSeenAt: now,
            createdAt: now,
          })
          .link({ user: userId }),
      );
    }
  } catch (e) {
    console.warn('[push] failed to upsert device row', e);
    return null;
  }

  return token;
}

export async function unregisterPushTokenForUser(userId: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  if (!Device.isDevice) return;
  const token = await getExpoPushToken(Notifications);
  if (!token) return;

  try {
    const existing = await (db as any).queryOnce({
      devices: {
        $: { where: { expoPushToken: token, 'user.id': userId } },
        user: {},
      },
    });
    const rows = Array.isArray(existing?.data?.devices) ? existing.data.devices : [];
    const ops = rows
      .filter((row: any) => linkedUserId(row) === userId && typeof row?.id === 'string')
      .map((row: any) => db.tx.devices[row.id].delete());
    if (ops.length > 0) {
      await db.transact(ops);
    }
  } catch (e) {
    console.warn('[push] failed to unregister device row', e);
  }
}

export async function touchDeviceLastSeen(token: string, userId: string): Promise<void> {
  try {
    const existing = await (db as any).queryOnce({
      devices: {
        $: { where: { expoPushToken: token, 'user.id': userId } },
        user: {},
      },
    });
    const row = existing?.data?.devices?.[0];
    if (!row) return;
    if (linkedUserId(row) !== userId) return;
    await db.transact(db.tx.devices[row.id].update({ lastSeenAt: Date.now() }));
  } catch {
    /* best-effort */
  }
}

export async function addNotificationResponseRouteListener(
  onRoute: (route: string) => void,
): Promise<NotificationSubscription | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { route?: string }
      | undefined;
    const route = safeNotificationRoute(data?.route);
    if (route) onRoute(route);
  });
}
