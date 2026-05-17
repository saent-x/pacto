import appConfig from '../../app.json';

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
});
