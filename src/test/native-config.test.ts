import { readFileSync } from 'node:fs';
import path from 'node:path';

import appConfigFactory from '../../app.config.js';

const appConfig = appConfigFactory();

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
      output: 'server',
      favicon: './assets/images/icon.png',
      backgroundColor: '#F3EDE2',
      themeColor: '#F3EDE2',
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

  it('does not declare unused native camera access', () => {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const iosInfoPlist = readFileSync(path.join(process.cwd(), 'ios/Pacto/Info.plist'), 'utf8');
    const androidManifest = readFileSync(
      path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    const androidBuildGradle = readFileSync(
      path.join(process.cwd(), 'android/app/build.gradle'),
      'utf8',
    );
    const cameraPlugin = expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera',
    );

    expect(cameraPlugin).toBeUndefined();
    expect(packageJson.dependencies).not.toHaveProperty('expo-camera');
    expect(expo.android.permissions).not.toContain('android.permission.CAMERA');
    expect(expo.android.blockedPermissions).toContain('android.permission.CAMERA');
    expect(iosInfoPlist).not.toContain('NSCameraUsageDescription');
    expect(androidManifest).toContain(
      '<uses-permission android:name="android.permission.CAMERA" tools:node="remove"/>',
    );
    expect(androidBuildGradle).toContain("'android.permission.CAMERA'");
  });

  it('keeps weather location access foreground and approximate-only', () => {
    const iosInfoPlist = readFileSync(path.join(process.cwd(), 'ios/Pacto/Info.plist'), 'utf8');
    const androidManifest = readFileSync(
      path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    const androidBuildGradle = readFileSync(
      path.join(process.cwd(), 'android/app/build.gradle'),
      'utf8',
    );

    expect(expo.android.permissions).toContain('android.permission.ACCESS_COARSE_LOCATION');
    expect(expo.android.permissions).not.toContain('android.permission.ACCESS_FINE_LOCATION');
    expect(expo.android.blockedPermissions).toContain('android.permission.ACCESS_FINE_LOCATION');
    expect(androidManifest).toContain('android.permission.ACCESS_COARSE_LOCATION');
    expect(androidManifest).toContain(
      '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" tools:node="remove"/>',
    );
    expect(androidBuildGradle).toContain("'android.permission.ACCESS_FINE_LOCATION'");
    expect(expo.ios.infoPlist.NSLocationWhenInUseUsageDescription).toBe(
      'Pacto uses your location to show local weather on your Home screen.',
    );
    expect(iosInfoPlist).toContain('NSLocationWhenInUseUsageDescription');
    expect(iosInfoPlist).not.toContain('NSLocationAlwaysAndWhenInUseUsageDescription');
    expect(iosInfoPlist).not.toContain('NSLocationAlwaysUsageDescription');
  });

  it('does not configure a branded native splash before the app boot screen', () => {
    const splashPlugin = expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );

    expect(splashPlugin).toBeUndefined();
  });

  it('does not manually hold the native splash in the root layout', () => {
    const rootLayout = readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

    expect(rootLayout).not.toContain('expo-splash-screen');
    expect(rootLayout).not.toContain('preventAutoHideAsync');
    expect(rootLayout).not.toContain('hideAsync');
  });

  it('keeps generated native launch screens unbranded', () => {
    const iosLaunchScreen = readFileSync(
      path.join(process.cwd(), 'ios/Pacto/SplashScreen.storyboard'),
      'utf8',
    );
    const androidSplashStyles = readFileSync(
      path.join(process.cwd(), 'android/app/src/main/res/values/styles.xml'),
      'utf8',
    );

    expect(iosLaunchScreen).not.toContain('SplashScreenLogo');
    expect(iosLaunchScreen).not.toContain('EXPO-SplashScreen');
    expect(androidSplashStyles).not.toContain('@drawable/splashscreen_logo');
  });

  it('uses the same Android notification channel in config and runtime code', () => {
    const notificationsPlugin = expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications',
    );

    expect(notificationsPlugin).toBeDefined();
    expect(Array.isArray(notificationsPlugin) ? notificationsPlugin[1] : null).toMatchObject({
      icon: './assets/images/icon.png',
      color: '#F3EDE2',
      defaultChannel: 'default',
    });
  });

  it('declares a product-specific iOS photo library permission reason', () => {
    const iosInfoPlist = readFileSync(path.join(process.cwd(), 'ios/Pacto/Info.plist'), 'utf8');
    const reason = 'Pacto lets you choose photos to personalize your profile and memories.';

    expect(expo.ios.infoPlist.NSPhotoLibraryUsageDescription).toBe(reason);
    expect(iosInfoPlist).toContain(reason);
    expect(iosInfoPlist).not.toContain('Allow $(PRODUCT_NAME) to access your photos');
  });

  it('derives native Google Sign-In config from build-time env vars', () => {
    const dynamicAppConfig = readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');
    const envExample = readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
    const iosInfoPlist = readFileSync(path.join(process.cwd(), 'ios/Pacto/Info.plist'), 'utf8');
    const iosPodfile = readFileSync(path.join(process.cwd(), 'ios/Podfile'), 'utf8');

    expect(dynamicAppConfig).toContain('@react-native-google-signin/google-signin');
    expect(dynamicAppConfig).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    expect(envExample).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=');
    expect(envExample).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=');
    expect(iosPodfile).toContain("config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.4'");
    expect(iosInfoPlist).toContain(
      'com.googleusercontent.apps.1054272612711-amsaaam2bqkqbpn3d65aknr47m90l7q3',
    );
  });

  it('declares production EAS build and submit profiles for both native stores', () => {
    const easConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'eas.json'), 'utf8'));

    expect(easConfig.cli).toMatchObject({
      appVersionSource: 'remote',
    });
    expect(easConfig.build.production).toMatchObject({
      autoIncrement: true,
      ios: {
        simulator: false,
      },
      android: {
        buildType: 'app-bundle',
      },
    });
    expect(easConfig.submit.production).toMatchObject({
      ios: {
        ascAppId: expect.any(String),
        appleTeamId: 'FY8SWUHG89',
      },
      android: {
        serviceAccountKeyPath: './secrets/google-play-service-account.json',
        track: 'internal',
      },
    });
  });

  it('pins the iOS deployment target required by Expo native modules', () => {
    const dynamicAppConfig = readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');

    expect(dynamicAppConfig).toContain('expo-build-properties');
    expect(dynamicAppConfig).toContain("const IOS_DEPLOYMENT_TARGET = '16.4'");
    expect(dynamicAppConfig).toContain('deploymentTarget: IOS_DEPLOYMENT_TARGET');
  });

  it('patches the Google Sign-In Expo adapter to the same iOS target', () => {
    const googleSignInPatch = readFileSync(
      path.join(
        process.cwd(),
        'patches/@react-native-google-signin+google-signin+16.1.2.patch',
      ),
      'utf8',
    );

    expect(googleSignInPatch).toContain("-  s.platform       = :ios, '13.4'");
    expect(googleSignInPatch).toContain("+  s.platform       = :ios, '16.4'");
  });
});
