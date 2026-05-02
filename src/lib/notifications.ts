import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db, id } from './instant';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const idFor = (reminderId: string) => `reminder:${reminderId}`;

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  dueAtIso: string,
): Promise<string | null> {
  const fireAt = new Date(dueAtIso).getTime();
  if (!Number.isFinite(fireAt) || fireAt <= Date.now()) return null;
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
  await Notifications.cancelScheduledNotificationAsync(idFor(reminderId)).catch(() => undefined);
}

// --- Push token registration ---------------------------------------------

function getProjectId(): string | undefined {
  const expo = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expo?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FAF8F2',
  });
}

/**
 * Acquire Expo push token and upsert it into the `devices` entity for this user.
 * Returns the token, or null if running on a simulator / permission denied / no projectId.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators cannot get APNs/FCM tokens
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  await ensureAndroidChannel();

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] no EAS projectId configured — run `eas init` first');
    return null;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed', e);
    return null;
  }

  try {
    const existing = await (db as any).queryOnce({
      devices: { $: { where: { expoPushToken: token } } },
    });
    const row = existing?.data?.devices?.[0] ?? null;
    const now = Date.now();
    if (row) {
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
  }

  return token;
}

export async function touchDeviceLastSeen(token: string): Promise<void> {
  try {
    const existing = await (db as any).queryOnce({
      devices: { $: { where: { expoPushToken: token } } },
    });
    const row = existing?.data?.devices?.[0];
    if (!row) return;
    await db.transact(db.tx.devices[row.id].update({ lastSeenAt: Date.now() }));
  } catch {
    /* best-effort */
  }
}
