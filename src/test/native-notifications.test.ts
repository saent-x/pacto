import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Platform } from 'react-native';

const notificationsMock = vi.hoisted(() => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  scheduleNotificationAsync: vi.fn(async () => undefined),
  getExpoPushTokenAsync: vi.fn(async () => ({ data: 'expo-push-token' })),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  AndroidImportance: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const instantMock = vi.hoisted(() => {
  const txProxy = (): any =>
    new Proxy(() => undefined, {
      get: () => txProxy(),
      apply: () => txProxy(),
    });

  return {
    db: {
      queryOnce: vi.fn(async () => ({ data: { devices: [] } })),
      transact: vi.fn(async () => undefined),
      tx: txProxy(),
    },
    id: vi.fn(() => 'device-id'),
  };
});

vi.mock('expo-notifications', () => notificationsMock);
vi.mock('expo-device', () => ({ isDevice: true }));
vi.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
      extra: { eas: { projectId: 'project-id' } },
    },
  },
}));
vi.mock('@/src/lib/instant', () => instantMock);

import {
  addNotificationResponseRouteListener,
  registerPushToken,
  scheduleReminderNotification,
  touchDeviceLastSeen,
  unregisterPushTokenForUser,
} from '@/src/lib/notifications';

const originalOS = Platform.OS;

describe('native notification setup', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('creates the Android notification channel before requesting reminder permission', async () => {
    await scheduleReminderNotification(
      'reminder-1',
      'Water the basil',
      new Date(Date.now() + 60_000).toISOString(),
    );

    expect(notificationsMock.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ name: 'Default', importance: 'high' }),
    );
    expect(notificationsMock.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      notificationsMock.getPermissionsAsync.mock.invocationCallOrder[0],
    );
    expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('creates the Android notification channel before requesting push-token permission', async () => {
    await registerPushToken('user-1');

    expect(notificationsMock.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ name: 'Default', importance: 'high' }),
    );
    expect(notificationsMock.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      notificationsMock.getPermissionsAsync.mock.invocationCallOrder[0],
    );
    expect(notificationsMock.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-id' });
    expect(instantMock.db.transact).toHaveBeenCalled();
  });

  it('does not claim an existing push token row owned by another user', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    instantMock.db.queryOnce.mockResolvedValueOnce({
      data: {
        devices: [
          {
            id: 'existing-device',
            expoPushToken: 'expo-push-token',
            user: { id: 'other-user' },
          },
        ],
      },
    });

    try {
      const token = await registerPushToken('user-1');

      expect(token).toBeNull();
      expect(instantMock.db.transact).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[push] push token already belongs to another user; refusing to relink',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('unregisters the current user device row for this push token', async () => {
    instantMock.db.queryOnce.mockResolvedValueOnce({
      data: {
        devices: [
          {
            id: 'current-device',
            expoPushToken: 'expo-push-token',
            user: { id: 'user-1' },
          },
        ],
      },
    });

    await unregisterPushTokenForUser('user-1');

    expect(instantMock.db.queryOnce).toHaveBeenCalledWith({
      devices: {
        $: { where: { expoPushToken: 'expo-push-token', 'user.id': 'user-1' } },
        user: {},
      },
    });
    expect(instantMock.db.transact).toHaveBeenCalledTimes(1);
  });

  it('touches last-seen only for a device row owned by the current user', async () => {
    instantMock.db.queryOnce.mockResolvedValueOnce({
      data: {
        devices: [
          {
            id: 'current-device',
            expoPushToken: 'expo-push-token',
            user: { id: 'user-1' },
          },
        ],
      },
    });

    await touchDeviceLastSeen('expo-push-token', 'user-1');

    expect(instantMock.db.queryOnce).toHaveBeenCalledWith({
      devices: {
        $: { where: { expoPushToken: 'expo-push-token', 'user.id': 'user-1' } },
        user: {},
      },
    });
    expect(instantMock.db.transact).toHaveBeenCalledTimes(1);
  });

  it('does not touch last-seen for a push token row owned by another user', async () => {
    instantMock.db.queryOnce.mockResolvedValueOnce({
      data: {
        devices: [
          {
            id: 'foreign-device',
            expoPushToken: 'expo-push-token',
            user: { id: 'other-user' },
          },
        ],
      },
    });

    await touchDeviceLastSeen('expo-push-token', 'user-1');

    expect(instantMock.db.transact).not.toHaveBeenCalled();
  });

  it('returns null when the push token cannot be persisted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    instantMock.db.queryOnce.mockResolvedValueOnce({ data: { devices: [] } });
    instantMock.db.transact.mockRejectedValueOnce(new Error('unique conflict'));

    try {
      const token = await registerPushToken('user-1');

      expect(token).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[push] failed to upsert device row',
        expect.any(Error),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('treats native notification permission API failures as unavailable permissions', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const permissionError = new Error('permission bridge unavailable');
    notificationsMock.getPermissionsAsync.mockRejectedValueOnce(permissionError);

    try {
      const reminderIdentifier = await scheduleReminderNotification(
        'reminder-2',
        'Call dentist',
        new Date(Date.now() + 60_000).toISOString(),
      );

      expect(reminderIdentifier).toBeNull();
      expect(notificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[notifications] permission request failed',
        permissionError,
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('ignores external or unknown routes from tapped push notifications', async () => {
    const onRoute = vi.fn();

    await addNotificationResponseRouteListener(onRoute);

    const listener = notificationsMock.addNotificationResponseReceivedListener.mock.calls.at(-1)?.[0];
    expect(listener).toBeTypeOf('function');

    listener({
      notification: {
        request: {
          content: {
            data: { route: 'https://example.test/phish' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/forged' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/us/milestones' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/not-real' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/memories/not-a-uuid' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/memories/profile/not-a-uuid' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/us/tasks/not-a-uuid?taskId=also-bad' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/us/timetables/../plans' },
          },
        },
      },
    });
    listener({
      notification: {
        request: {
          content: {
            data: { route: '/(tabs)/us/reminders' },
          },
        },
      },
    });

    expect(onRoute).toHaveBeenCalledTimes(1);
    expect(onRoute).toHaveBeenCalledWith('/(tabs)/us/reminders');
  });
});
