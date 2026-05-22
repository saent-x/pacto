import appConfig from '../../app.json';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('native app config', () => {
  const expo = appConfig.expo;

  it('targets phone-first iOS and native Android navigation affordances', () => {
    expect(expo.platforms).toEqual(['ios', 'android', 'web']);
    expect(expo.ios.supportsTablet).toBe(false);
    expect(expo.android.predictiveBackGestureEnabled).toBe(true);
  });

  it('keeps web enabled as a Metro-backed testing target', () => {
    expect(expo.web).toMatchObject({
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/icon.png',
      backgroundColor: '#FAF8F2',
      themeColor: '#FAF8F2',
    });
  });

  it('declares app-owned Android permissions in manifest-ready form', () => {
    expect(expo.android.permissions).toEqual(
      expect.arrayContaining(['android.permission.RECORD_AUDIO']),
    );
    expect(
      expo.android.permissions.every((permission) => permission.startsWith('android.permission.')),
    ).toBe(true);
    expect(expo.android.permissions).not.toEqual(
      expect.arrayContaining(['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'RECORD_AUDIO']),
    );
  });

  it('keeps the native splash aligned across light and dark launches', () => {
    const splashPlugin = expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );

    expect(splashPlugin).toBeDefined();
    expect(Array.isArray(splashPlugin) ? splashPlugin[1] : null).toMatchObject({
      backgroundColor: '#FAF8F2',
      image: './assets/images/splash-icon.png',
      imageWidth: 200,
      dark: {
        backgroundColor: '#0F0D0B',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    });
  });

  it('uses the same Android notification channel in config and runtime code', () => {
    const notificationsPlugin = expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications',
    );

    expect(notificationsPlugin).toBeDefined();
    expect(Array.isArray(notificationsPlugin) ? notificationsPlugin[1] : null).toMatchObject({
      icon: './assets/images/icon.png',
      color: '#FAF8F2',
      defaultChannel: 'default',
    });
  });

  it('derives native Google Sign-In config from build-time env vars', () => {
    const dynamicAppConfig = readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');
    const envExample = readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');

    expect(dynamicAppConfig).toContain('@react-native-google-signin/google-signin');
    expect(dynamicAppConfig).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    expect(dynamicAppConfig).toContain('1054272612711-amsaaam2bqkqbpn3d65aknr47m90l7q3');
    expect(envExample).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=');
    expect(envExample).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=');
  });

  it('pins the iOS deployment target required by Expo native modules', () => {
    const dynamicAppConfig = readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');

    expect(dynamicAppConfig).toContain('expo-build-properties');
    expect(dynamicAppConfig).toContain("const IOS_DEPLOYMENT_TARGET = '16.4'");
    expect(dynamicAppConfig).toContain('deploymentTarget: IOS_DEPLOYMENT_TARGET');
  });
});
