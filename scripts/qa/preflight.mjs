#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const json = args.includes('--json');
const strict = args.includes('--strict');
const skipTools = args.includes('--skip-tools');
const noDotenv = args.includes('--no-dotenv');

if (!noDotenv) loadDotEnvFiles();

const instant = inspectInstantEnv();
const server = await inspectServerEnv();
const native = inspectNative(skipTools);
const releaseReady = instant.writeReady && server.ready && nativeReady(native);
const result = {
  mode: 'preflight',
  instant,
  server,
  native,
  releaseReady,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printHuman(result);
}

if (strict && !releaseReady) process.exit(1);

function inspectInstantEnv() {
  const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID ?? '';
  const adminToken = process.env.INSTANT_ADMIN_TOKEN ?? '';
  const qaEnv = process.env.PACTO_QA_ENV ?? null;
  const confirmedAppId = process.env.PACTO_QA_CONFIRM_APP_ID ?? '';
  const allowWrites = process.env.PACTO_QA_ALLOW_STAGING_WRITES ?? '';
  const appIdPresent = appId.length > 0;
  const adminTokenPresent = adminToken.length > 0;
  const confirmedAppIdMatches = appIdPresent && confirmedAppId === appId;
  const stagingReady = appIdPresent && adminTokenPresent && qaEnv === 'staging' && confirmedAppIdMatches;
  const writeReady = stagingReady && allowWrites === '1';
  const missing = [];

  if (!appIdPresent) missing.push('EXPO_PUBLIC_INSTANT_APP_ID');
  if (!adminTokenPresent) missing.push('INSTANT_ADMIN_TOKEN');
  if (qaEnv !== 'staging') missing.push('PACTO_QA_ENV=staging');
  if (!confirmedAppIdMatches) missing.push('PACTO_QA_CONFIRM_APP_ID must match EXPO_PUBLIC_INSTANT_APP_ID');
  if (allowWrites !== '1') missing.push('PACTO_QA_ALLOW_STAGING_WRITES=1');

  return {
    appIdPresent,
    adminTokenPresent,
    qaEnv,
    confirmedAppIdMatches,
    allowWrites: allowWrites === '1',
    stagingReady,
    writeReady,
    missing,
  };
}

async function inspectServerEnv() {
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  const apiUrlPresent = apiUrl.length > 0;
  const apiUrlValid = apiUrlPresent && /^https:\/\/[^/\s]+/.test(apiUrl);
  const apiBaseUrl = apiUrlValid ? apiUrl.replace(/\/+$/, '') : null;
  const healthUrl = apiBaseUrl ? `${apiBaseUrl}/api/health` : null;
  const missing = [];
  let apiHealthOk = false;
  let instantAdminConfigured = false;
  let pushRouteReady = false;
  let memoriesRouteReady = false;
  let accountRouteReady = false;
  let healthStatus = null;
  let healthError = null;

  if (!apiUrlPresent) {
    missing.push('EXPO_PUBLIC_API_URL');
  } else if (!apiUrlValid) {
    missing.push('EXPO_PUBLIC_API_URL must be an https URL');
  } else {
    const mockHealth = getMockApiHealthPayload();
    const health = mockHealth ? normalizeApiHealth(mockHealth) : await fetchApiHealth(healthUrl);
    healthStatus = health.status;
    healthError = health.error;
    apiHealthOk = health.ok;
    instantAdminConfigured = health.instantAdminConfigured;
    pushRouteReady = health.routes.push;
    memoriesRouteReady = health.routes.memories;
    accountRouteReady = health.routes.account;

    if (!apiHealthOk) missing.push('EXPO_PUBLIC_API_URL /api/health reachable');
    if (!instantAdminConfigured) missing.push('API health must report Instant admin configuration');
    if (!pushRouteReady) missing.push('API health must report push route support');
    if (!memoriesRouteReady) missing.push('API health must report memories route support');
    if (!accountRouteReady) missing.push('API health must report account route support');
  }

  const trustedPushReady = apiUrlValid && apiHealthOk && pushRouteReady;
  const mediaApiReady = apiUrlValid && apiHealthOk && memoriesRouteReady;
  const accountApiReady = apiUrlValid && apiHealthOk && accountRouteReady;
  return {
    apiUrlPresent,
    apiUrlValid,
    apiHealthOk,
    healthStatus,
    healthError,
    instantAdminConfigured,
    pushRouteReady,
    memoriesRouteReady,
    accountRouteReady,
    trustedPushReady,
    mediaApiReady,
    accountApiReady,
    ready: trustedPushReady && mediaApiReady && accountApiReady && instantAdminConfigured,
    missing,
  };
}

function getMockApiHealthPayload() {
  const mockFlag = process.env.PACTO_QA_MOCK_API_HEALTH;
  if (mockFlag !== '1') {
    return null;
  }

  const rawPayload = process.env.PACTO_QA_API_HEALTH_PAYLOAD?.trim();
  const payload = rawPayload ? parseJson(rawPayload) : null;
  if (!payload || typeof payload !== 'object') {
    return { ok: true, routes: { push: true, memories: true, account: true }, instantAdminConfigured: true };
  }
  return payload;
}

function normalizeApiHealth(payload) {
  const routes = payload?.routes;
  return {
    ok: payload?.ok === true,
    status: 200,
    error: null,
    instantAdminConfigured: payload?.instantAdminConfigured === true,
    routes: {
      push: routes?.push === true,
      memories: routes?.memories === true,
      account: routes?.account === true,
    },
  };
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchApiHealth(url) {
  const timeoutMs = Number.parseInt(process.env.PACTO_QA_API_HEALTH_TIMEOUT_MS ?? '5000', 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 5000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok && payload?.ok === true,
      status: response.status,
      error: null,
      instantAdminConfigured: payload?.instantAdminConfigured === true,
      routes: {
        push: payload?.routes?.push === true,
        memories: payload?.routes?.memories === true,
        account: payload?.routes?.account === true,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error?.name === 'AbortError' ? 'timeout' : 'fetch failed',
      instantAdminConfigured: false,
      routes: {
        push: false,
        memories: false,
        account: false,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function inspectNative(skipToolChecks) {
  const releaseConfig = inspectNativeReleaseConfig();
  const releaseSigning = inspectAndroidReleaseSigning();
  if (skipToolChecks) {
    return {
      skipped: true,
      releaseConfig,
      ios: {
        xcrunAvailable: false,
        simctlAvailable: false,
        ready: false,
      },
      android: {
        androidHomeSet: false,
        androidHomeExists: false,
        adbAvailable: false,
        emulatorAvailable: false,
        avdmanagerAvailable: false,
        playStoreAvdName: null,
        playStoreAvds: [],
        playStoreAvdAvailable: false,
        googleAuthDeviceOverride: false,
        googleAuthReady: false,
        releaseSigning,
        missing: androidNativeMissing({ googleAuthReady: false, releaseSigning }),
        ready: false,
      },
    };
  }

  const androidHome = process.env.ANDROID_HOME ?? join(homedir(), 'Library/Android/sdk');
  const adbAvailable = commandAvailable('adb');
  const emulatorAvailable = commandAvailable('emulator');
  const avdmanagerAvailable = commandAvailable('avdmanager');
  const playStoreAvdName = process.env.PACTO_QA_ANDROID_PLAY_STORE_AVD ?? null;
  const playStoreAvds = avdmanagerAvailable ? listPlayStoreAvds() : [];
  const playStoreAvdAvailable = playStoreAvdName
    ? playStoreAvds.includes(playStoreAvdName)
    : playStoreAvds.length > 0;
  const googleAuthDeviceOverride = process.env.PACTO_QA_ANDROID_GOOGLE_AUTH_DEVICE === '1';
  const googleAuthReady = playStoreAvdAvailable || googleAuthDeviceOverride;
  const xcrunAvailable = commandAvailable('xcrun');
  const iosSimctlAvailable = xcrunAvailable && commandSucceeds('xcrun', ['simctl', 'list', 'devices', 'available', '-j']);
  const androidValues = {
    androidHomeSet: Boolean(process.env.ANDROID_HOME),
    androidHomeExists: existsSync(androidHome),
    adbAvailable,
    emulatorAvailable,
    avdmanagerAvailable,
    playStoreAvdName,
    playStoreAvds,
    playStoreAvdAvailable,
    googleAuthDeviceOverride,
    googleAuthReady,
    releaseSigning,
  };
  return {
    releaseConfig,
    ios: {
      xcrunAvailable,
      simctlAvailable: iosSimctlAvailable,
      ready: xcrunAvailable && iosSimctlAvailable,
    },
    android: {
      ...androidValues,
      missing: androidNativeMissing(androidValues),
      ready:
        existsSync(androidHome) &&
        adbAvailable &&
        emulatorAvailable &&
        googleAuthReady &&
        releaseSigning.ready,
    },
  };
}

function nativeReady(nativeValue) {
  if (nativeValue?.skipped) return false;
  return Boolean(nativeValue?.releaseConfig?.ready && nativeValue?.ios?.ready && nativeValue?.android?.ready);
}

function inspectNativeReleaseConfig() {
  const appConfigResult = readJsonFile('app.config.base.json');
  const easConfigResult = readJsonFile('eas.json');
  const expo = appConfigResult.data?.expo ?? {};
  const eas = easConfigResult.data ?? {};
  const missing = [];

  if (!appConfigResult.data) missing.push(appConfigResult.error ?? 'app.config.base.json');
  if (!easConfigResult.data) missing.push(easConfigResult.error ?? 'eas.json');

  const projectIdPresent = Boolean(expo.extra?.eas?.projectId);
  const appVersion = expo.version ?? null;
  const iosBundleIdentifier = expo.ios?.bundleIdentifier ?? null;
  const iosBuildNumber = expo.ios?.buildNumber ?? null;
  const androidPackage = expo.android?.package ?? null;
  const androidVersionCode = expo.android?.versionCode;
  const iosBuildNumberPresent = Boolean(iosBuildNumber);
  const androidVersionCodePresent = Number.isInteger(expo.android?.versionCode);
  const appVersionSourceRemote = eas.cli?.appVersionSource === 'remote';
  const productionBuild = eas.build?.production ?? null;
  const productionBuildProfilePresent = Boolean(productionBuild);
  const productionAutoIncrement = productionBuild?.autoIncrement === true;
  const iosProductionBuildForDevice = productionBuild?.ios?.simulator === false;
  const androidAppBundleBuild = productionBuild?.android?.buildType === 'app-bundle';
  const iosSubmit = eas.submit?.production?.ios ?? null;
  const androidSubmit = eas.submit?.production?.android ?? null;
  const iosSubmitConfigured = Boolean(iosSubmit?.ascAppId && iosSubmit?.appleTeamId);
  const androidSubmitServiceAccountKeyPath = androidSubmit?.serviceAccountKeyPath ?? null;
  const androidSubmitConfigured = Boolean(androidSubmitServiceAccountKeyPath && androidSubmit?.track);
  const androidSubmitServiceAccountFileExists = Boolean(
    androidSubmitServiceAccountKeyPath &&
      existsSync(resolveProjectPath(androidSubmitServiceAccountKeyPath)),
  );

  const pbxproj = readTextFile('ios/Pacto.xcodeproj/project.pbxproj');
  const nativeIosBundleIdentifiers = collectPbxprojValues(pbxproj, 'PRODUCT_BUNDLE_IDENTIFIER');
  const nativeIosTeamIds = collectPbxprojValues(pbxproj, 'DEVELOPMENT_TEAM');
  const iosNativeBundleIdentifierMatches = Boolean(
    iosBundleIdentifier && nativeIosBundleIdentifiers.includes(iosBundleIdentifier),
  );
  const iosTeamMatchesSubmit = Boolean(iosSubmit?.appleTeamId && nativeIosTeamIds.includes(iosSubmit.appleTeamId));
  const infoPlist = readTextFile('ios/Pacto/Info.plist');
  const nativeIosShortVersion = readPlistStringValue(infoPlist, 'CFBundleShortVersionString');
  const nativeIosBuildNumber = readPlistStringValue(infoPlist, 'CFBundleVersion');
  const iosShortVersionMatchesNative = Boolean(appVersion && nativeIosShortVersion === appVersion);
  const iosBuildNumberMatchesNative = Boolean(iosBuildNumber && nativeIosBuildNumber === iosBuildNumber);

  const gradle = readTextFile('android/app/build.gradle');
  const nativeAndroidApplicationIds = collectGradleApplicationIds(gradle);
  const androidNativePackageMatches = Boolean(androidPackage && nativeAndroidApplicationIds.includes(androidPackage));
  const nativeAndroidVersionNames = collectGradleStringValues(gradle, 'versionName');
  const nativeAndroidVersionCodes = collectGradleNumberValues(gradle, 'versionCode');
  const androidVersionNameMatchesNative = Boolean(appVersion && nativeAndroidVersionNames.includes(appVersion));
  const androidVersionCodeMatchesNative = Boolean(
    Number.isInteger(androidVersionCode) && nativeAndroidVersionCodes.includes(androidVersionCode),
  );

  if (!projectIdPresent) missing.push('Expo EAS projectId');
  if (!appVersion) missing.push('Expo app version');
  if (!iosBundleIdentifier) missing.push('iOS bundleIdentifier');
  if (!androidPackage) missing.push('Android package');
  if (!iosBuildNumberPresent) missing.push('iOS buildNumber');
  if (!androidVersionCodePresent) missing.push('Android versionCode');
  if (!appVersionSourceRemote) missing.push('EAS cli.appVersionSource=remote');
  if (!productionBuildProfilePresent) missing.push('EAS production build profile');
  if (!productionAutoIncrement) missing.push('EAS production autoIncrement=true');
  if (!iosProductionBuildForDevice) missing.push('EAS production iOS simulator=false');
  if (!androidAppBundleBuild) missing.push('EAS production Android buildType=app-bundle');
  if (!iosSubmitConfigured) missing.push('EAS production iOS submit ascAppId/appleTeamId');
  if (!androidSubmitConfigured) missing.push('EAS production Android submit serviceAccountKeyPath/track');
  if (androidSubmitConfigured && !androidSubmitServiceAccountFileExists) {
    missing.push('EAS production Android submit serviceAccountKeyPath file must exist');
  }
  if (!iosNativeBundleIdentifierMatches) missing.push('Native iOS bundle id must match Expo config');
  if (!iosShortVersionMatchesNative) missing.push('Native iOS short version must match Expo version');
  if (!iosBuildNumberMatchesNative) missing.push('Native iOS build number must match Expo config');
  if (!iosTeamMatchesSubmit) missing.push('Native iOS DEVELOPMENT_TEAM must match EAS submit appleTeamId');
  if (!androidNativePackageMatches) missing.push('Native Android applicationId must match Expo config');
  if (!androidVersionNameMatchesNative) missing.push('Native Android versionName must match Expo version');
  if (!androidVersionCodeMatchesNative) missing.push('Native Android versionCode must match Expo config');

  return {
    appConfigPresent: Boolean(appConfigResult.data),
    easJsonPresent: Boolean(easConfigResult.data),
    projectIdPresent,
    appVersionPresent: Boolean(appVersion),
    appVersionSourceRemote,
    productionBuildProfilePresent,
    productionAutoIncrement,
    ios: {
      bundleIdentifierPresent: Boolean(iosBundleIdentifier),
      buildNumberPresent: iosBuildNumberPresent,
      shortVersionMatchesNative: iosShortVersionMatchesNative,
      buildNumberMatchesNative: iosBuildNumberMatchesNative,
      productionBuildForDevice: iosProductionBuildForDevice,
      nativeBundleIdentifierMatches: iosNativeBundleIdentifierMatches,
      teamMatchesSubmit: iosTeamMatchesSubmit,
      submitConfigured: iosSubmitConfigured,
    },
    android: {
      packagePresent: Boolean(androidPackage),
      versionCodePresent: androidVersionCodePresent,
      appBundleBuild: androidAppBundleBuild,
      nativePackageMatches: androidNativePackageMatches,
      versionNameMatchesNative: androidVersionNameMatchesNative,
      versionCodeMatchesNative: androidVersionCodeMatchesNative,
      submitConfigured: androidSubmitConfigured,
      submitServiceAccountFileExists: androidSubmitServiceAccountFileExists,
    },
    missing,
    ready: missing.length === 0,
  };
}

function inspectAndroidReleaseSigning() {
  const gradlePath = join(process.cwd(), 'android/app/build.gradle');
  const requiredVars = [
    'PACTO_ANDROID_RELEASE_STORE_FILE',
    'PACTO_ANDROID_RELEASE_STORE_PASSWORD',
    'PACTO_ANDROID_RELEASE_KEY_ALIAS',
    'PACTO_ANDROID_RELEASE_KEY_PASSWORD',
  ];
  const values = Object.fromEntries(requiredVars.map((name) => [name, configValue(name)]));
  const storeFile = values.PACTO_ANDROID_RELEASE_STORE_FILE;
  const storeFileExists = Boolean(storeFile && existsSync(resolveProjectPath(storeFile)));
  const credentialsPresent = requiredVars.every((name) => Boolean(values[name]));
  const missing = requiredVars.filter((name) => !values[name]);
  if (storeFile && !storeFileExists) {
    missing.push('PACTO_ANDROID_RELEASE_STORE_FILE must point to an existing keystore');
  }

  if (!existsSync(gradlePath)) {
    return {
      configured: false,
      usesDebugKeystore: false,
      credentialsPresent,
      storeFileExists,
      missing: ['android/app/build.gradle', ...missing],
      ready: false,
    };
  }

  const gradle = readFileSync(gradlePath, 'utf8');
  const releaseBlock = extractBlockAfter(extractBlockAfter(gradle, 'buildTypes'), 'release');
  const usesDebugKeystore = /signingConfig\s+signingConfigs\.debug\b/.test(releaseBlock);
  const hasSigningConfig = /signingConfig\s+signingConfigs\.[A-Za-z0-9_]+\b/.test(releaseBlock);
  if (usesDebugKeystore) missing.push('Android release signing must not use signingConfigs.debug');

  return {
    configured: hasSigningConfig,
    usesDebugKeystore,
    credentialsPresent,
    storeFileExists,
    missing,
    ready: hasSigningConfig && !usesDebugKeystore && credentialsPresent && storeFileExists,
  };
}

function androidNativeMissing({ googleAuthReady, releaseSigning }) {
  const missing = [];
  if (!googleAuthReady) missing.push('Play Store AVD or PACTO_QA_ANDROID_GOOGLE_AUTH_DEVICE=1');
  if (!releaseSigning?.configured) missing.push('Android release signing config');
  missing.push(...(releaseSigning?.missing ?? []));
  return missing;
}

function extractBlockAfter(text, name) {
  const match = new RegExp(`\\b${name}\\s*\\{`).exec(text);
  if (!match) return '';

  const openIndex = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }

  return '';
}

function configValue(name) {
  const envValue = process.env[name];
  if (envValue?.trim()) return envValue.trim();

  for (const file of ['android/gradle.properties']) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key !== name) continue;
      const value = trimmed.slice(eq + 1).trim();
      if (value) return value;
    }
  }

  return null;
}

function resolveProjectPath(value) {
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

function commandAvailable(command) {
  return commandSucceeds('sh', ['-lc', `command -v ${shellQuote(command)} >/dev/null 2>&1`]);
}

function commandSucceeds(command, commandArgs) {
  try {
    execFileSync(command, commandArgs, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function listPlayStoreAvds() {
  let output = '';
  try {
    output = execFileSync('avdmanager', ['list', 'avd'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return [];
  }

  const blocks = output.split(/\n(?=\s*Name:\s+)/);
  return blocks
    .map((block) => {
      const name = block.match(/^\s*Name:\s*(.+)$/m)?.[1]?.trim();
      if (!name) return null;
      return /Google Play|google_apis_playstore/i.test(block) ? name : null;
    })
    .filter(Boolean);
}

function readJsonFile(path) {
  if (!existsSync(path)) return { data: null, error: path };

  try {
    return { data: JSON.parse(readFileSync(path, 'utf8')), error: null };
  } catch {
    return { data: null, error: `${path} must contain valid JSON` };
  }
}

function readTextFile(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function collectPbxprojValues(text, key) {
  const pattern = new RegExp(`\\b${key}\\s*=\\s*([^;]+);`, 'g');
  return [...text.matchAll(pattern)]
    .map((match) => match[1]?.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

function collectGradleApplicationIds(text) {
  return [...text.matchAll(/\bapplicationId\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter(Boolean);
}

function collectGradleStringValues(text, key) {
  const pattern = new RegExp(`\\b${key}\\s+['"]([^'"]+)['"]`, 'g');
  return [...text.matchAll(pattern)]
    .map((match) => match[1])
    .filter(Boolean);
}

function collectGradleNumberValues(text, key) {
  const pattern = new RegExp(`\\b${key}\\s+(\\d+)`, 'g');
  return [...text.matchAll(pattern)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isInteger);
}

function readPlistStringValue(text, key) {
  const pattern = new RegExp(`<key>${escapeRegex(key)}</key>\\s*<string>([^<]+)</string>`);
  return pattern.exec(text)?.[1] ?? null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function loadDotEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function printHuman(value) {
  console.log(`Instant staging ready: ${value.instant.stagingReady ? 'yes' : 'no'}`);
  console.log(`Instant staging writes ready: ${value.instant.writeReady ? 'yes' : 'no'}`);
  if (value.instant.missing.length > 0) {
    console.log(`Instant missing/failed checks: ${value.instant.missing.join(', ')}`);
  }
  console.log(`Server API ready: ${value.server.ready ? 'yes' : 'no'}`);
  console.log(`Server API health ready: ${value.server.apiHealthOk ? 'yes' : 'no'}`);
  console.log(`Trusted push ready: ${value.server.trustedPushReady ? 'yes' : 'no'}`);
  console.log(`Trusted media API ready: ${value.server.mediaApiReady ? 'yes' : 'no'}`);
  if (value.server.missing.length > 0) {
    console.log(`Server missing/failed checks: ${value.server.missing.join(', ')}`);
  }
  if (value.native.skipped) {
    console.log('Native tool checks: skipped');
    console.log(`Native release config ready: ${value.native.releaseConfig.ready ? 'yes' : 'no'}`);
    if (value.native.releaseConfig.missing.length > 0) {
      console.log(`Native release config missing/failed checks: ${value.native.releaseConfig.missing.join(', ')}`);
    }
    console.log(
      `Android release signing ready: ${value.native.android.releaseSigning.ready ? 'yes' : 'no'}`
    );
  } else {
    console.log(`Native release config ready: ${value.native.releaseConfig.ready ? 'yes' : 'no'}`);
    if (value.native.releaseConfig.missing.length > 0) {
      console.log(`Native release config missing/failed checks: ${value.native.releaseConfig.missing.join(', ')}`);
    }
    console.log(`iOS tooling ready: ${value.native.ios.ready ? 'yes' : 'no'}`);
    console.log(`Android tooling ready: ${value.native.android.ready ? 'yes' : 'no'}`);
    console.log(`Android Google auth ready: ${value.native.android.googleAuthReady ? 'yes' : 'no'}`);
    console.log(
      `Android release signing ready: ${value.native.android.releaseSigning.ready ? 'yes' : 'no'}`
    );
    if (value.native.android.missing.length > 0) {
      console.log(`Android native missing/failed checks: ${value.native.android.missing.join(', ')}`);
    }
  }
  console.log(`Release preflight ready: ${value.releaseReady ? 'yes' : 'no'}`);
}
