import * as Notifications from 'expo-notifications';

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
