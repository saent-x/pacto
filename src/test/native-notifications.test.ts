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
  registerPushToken,
  scheduleReminderNotification,
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
});
