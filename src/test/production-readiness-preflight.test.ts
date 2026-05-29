import { execFile, execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function runPreflight(env: Record<string, string | undefined>) {
  const output = execFileSync(
    process.execPath,
    ['scripts/qa/preflight.mjs', '--json', '--skip-tools', '--no-dotenv'],
    {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        ...env,
      },
    },
  );
  return JSON.parse(output);
}

async function withApiHealthServer<T>(
  payload: Record<string, unknown>,
  callback: (apiUrl: string) => T | Promise<T>,
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'coupl-api-health-'));
  const scriptPath = join(dir, 'server.mjs');
  writeFileSync(join(dir, 'cert.pem'), TEST_CERT);
  writeFileSync(join(dir, 'key.pem'), TEST_KEY);
  writeFileSync(scriptPath, `
    import { createServer } from 'node:https';
    import { readFileSync } from 'node:fs';
    const payload = ${JSON.stringify(payload)};
    const server = createServer({
      cert: readFileSync(${JSON.stringify(join(dir, 'cert.pem'))}),
      key: readFileSync(${JSON.stringify(join(dir, 'key.pem'))}),
    }, (req, res) => {
      if (req.url !== '/api/health') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
        return;
      }
      res.writeHead(payload.ok ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
    server.listen(0, '127.0.0.1', () => {
      console.log(server.address().port);
    });
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
  `);

  const child = execFile(process.execPath, [scriptPath], {
    env: { PATH: process.env.PATH },
  });

  try {
    const port = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('API health server did not start')), 3000);
      child.stdout?.once('data', (chunk) => {
        clearTimeout(timer);
        resolve(String(chunk).trim());
      });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code !== null && code !== 0) reject(new Error(`API health server exited with ${code}`));
      });
    });
    return await callback(`https://127.0.0.1:${port}`);
  } finally {
    child.kill('SIGTERM');
    rmSync(dir, { force: true, recursive: true });
  }
}

function runPreflightWithFakeTools({
  androidHome,
  avdOutput,
  extraEnv = {},
}: {
  androidHome: string;
  avdOutput: string;
  extraEnv?: Record<string, string>;
}) {
  const binDir = mkdtempSync(join(tmpdir(), 'coupl-preflight-bin-'));
  const makeCommand = (name: string, body: string) => {
    const path = join(binDir, name);
    writeFileSync(path, `#!/bin/sh\n${body}\n`);
    chmodSync(path, 0o755);
  };

  makeCommand('adb', 'exit 0');
  makeCommand('emulator', 'exit 0');
  makeCommand('xcrun', 'exit 0');
  makeCommand('avdmanager', `cat <<'EOF'\n${avdOutput}\nEOF`);

  try {
    const output = execFileSync(process.execPath, ['scripts/qa/preflight.mjs', '--json', '--no-dotenv'], {
      encoding: 'utf8',
      env: {
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        ANDROID_HOME: androidHome,
        EXPO_PUBLIC_INSTANT_APP_ID: 'staging-app-id',
        INSTANT_ADMIN_TOKEN: 'admin-secret-token',
        PACTO_QA_ENV: 'staging',
        PACTO_QA_CONFIRM_APP_ID: 'staging-app-id',
        PACTO_QA_ALLOW_STAGING_WRITES: '1',
        ...extraEnv,
      },
    });
    return JSON.parse(output);
  } finally {
    rmSync(binDir, { force: true, recursive: true });
  }
}

async function withAndroidPlayServiceAccount<T>(callback: () => T | Promise<T>): Promise<T> {
  const dir = join(process.cwd(), 'secrets');
  const path = join(dir, 'google-play-service-account.json');
  const dirExisted = existsSync(dir);
  const fileExisted = existsSync(path);

  if (!fileExisted) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify({ type: 'service_account', project_id: 'test-play-project' }));
  }

  try {
    return await callback();
  } finally {
    if (!fileExisted) rmSync(path, { force: true });
    if (!dirExisted) rmSync(dir, { force: true, recursive: true });
  }
}

describe('production readiness preflight', () => {
  it('reports staging InstantDB readiness without leaking secret values', () => {
    const result = runPreflight({
      EXPO_PUBLIC_INSTANT_APP_ID: 'staging-app-id',
      INSTANT_ADMIN_TOKEN: 'admin-secret-token',
      PACTO_QA_ENV: 'staging',
      PACTO_QA_CONFIRM_APP_ID: 'staging-app-id',
      PACTO_QA_ALLOW_STAGING_WRITES: '1',
    });

    expect(result.instant).toMatchObject({
      appIdPresent: true,
      adminTokenPresent: true,
      qaEnv: 'staging',
      confirmedAppIdMatches: true,
      stagingReady: true,
      writeReady: true,
    });
    expect(JSON.stringify(result)).not.toContain('admin-secret-token');
    expect(JSON.stringify(result)).not.toContain('staging-app-id');
  });

  it('does not treat credentials alone as staging-write ready', () => {
    const result = runPreflight({
      EXPO_PUBLIC_INSTANT_APP_ID: 'production-shaped-id',
      INSTANT_ADMIN_TOKEN: 'admin-secret-token',
      PACTO_QA_ENV: 'production',
      PACTO_QA_CONFIRM_APP_ID: 'different-id',
      PACTO_QA_ALLOW_STAGING_WRITES: '0',
    });

    expect(result.instant).toMatchObject({
      appIdPresent: true,
      adminTokenPresent: true,
      qaEnv: 'production',
      confirmedAppIdMatches: false,
      stagingReady: false,
      writeReady: false,
    });
    expect(result.releaseReady).toBe(false);
  });

  it('requires a deployed API base URL for trusted push delivery', () => {
    const result = runPreflight({
      EXPO_PUBLIC_INSTANT_APP_ID: 'staging-app-id',
      INSTANT_ADMIN_TOKEN: 'admin-secret-token',
      PACTO_QA_ENV: 'staging',
      PACTO_QA_CONFIRM_APP_ID: 'staging-app-id',
      PACTO_QA_ALLOW_STAGING_WRITES: '1',
    });

    expect(result.server).toMatchObject({
      apiUrlPresent: false,
      trustedPushReady: false,
    });
    expect(result.server.missing).toContain('EXPO_PUBLIC_API_URL');
    expect(result.releaseReady).toBe(false);
  });

  it('does not treat a bare HTTPS API URL as release-ready without a healthy API response', () => {
    const result = runPreflight({
      EXPO_PUBLIC_INSTANT_APP_ID: 'staging-app-id',
      INSTANT_ADMIN_TOKEN: 'admin-secret-token',
      PACTO_QA_ENV: 'staging',
      PACTO_QA_CONFIRM_APP_ID: 'staging-app-id',
      PACTO_QA_ALLOW_STAGING_WRITES: '1',
      EXPO_PUBLIC_API_URL: 'https://pacto.invalid.test',
      PACTO_QA_API_HEALTH_TIMEOUT_MS: '1',
    });

    expect(result.server).toMatchObject({
      apiUrlPresent: true,
      apiUrlValid: true,
      apiHealthOk: false,
      trustedPushReady: false,
      mediaApiReady: false,
      ready: false,
    });
    expect(result.server.missing).toContain('EXPO_PUBLIC_API_URL /api/health reachable');
    expect(result.releaseReady).toBe(false);
  });

  it('reports store release profile configuration before native tool checks run', () => {
    const result = runPreflight({});

    expect(result.native.skipped).toBe(true);
    expect(result.native.releaseConfig).toMatchObject({
      appConfigPresent: true,
      easJsonPresent: true,
      projectIdPresent: true,
      appVersionSourceRemote: true,
      productionBuildProfilePresent: true,
      productionAutoIncrement: true,
      appVersionPresent: true,
      ios: {
        bundleIdentifierPresent: true,
        buildNumberPresent: true,
        shortVersionMatchesNative: true,
        buildNumberMatchesNative: true,
        productionBuildForDevice: true,
        nativeBundleIdentifierMatches: true,
        teamMatchesSubmit: true,
        submitConfigured: true,
      },
      android: {
        packagePresent: true,
        versionCodePresent: true,
        appBundleBuild: true,
        nativePackageMatches: true,
        versionNameMatchesNative: true,
        versionCodeMatchesNative: true,
        submitConfigured: true,
        submitServiceAccountFileExists: false,
      },
      ready: false,
    });
    expect(result.native.releaseConfig.missing).toContain(
      'EAS production Android submit serviceAccountKeyPath file must exist',
    );
    expect(result.releaseReady).toBe(false);
  });

  it('reports Android Google auth readiness when a Play Store AVD is available', () => {
    const androidHome = mkdtempSync(join(tmpdir(), 'coupl-android-home-'));
    try {
      const result = runPreflightWithFakeTools({
        androidHome,
        avdOutput: [
          'Available Android Virtual Devices:',
          '    Name: coupl_android_35_play',
          '  Target: Google Play (Google Inc.)',
          '          Based on: Android 15.0 Tag/ABI: google_apis_playstore/arm64-v8a',
        ].join('\n'),
      });

      expect(result.native.android).toMatchObject({
        adbAvailable: true,
        emulatorAvailable: true,
        avdmanagerAvailable: true,
        playStoreAvdAvailable: true,
        googleAuthReady: true,
        ready: false,
        releaseSigning: {
          credentialsPresent: false,
          ready: false,
          usesDebugKeystore: false,
        },
      });
      expect(result.releaseReady).toBe(false);
    } finally {
      rmSync(androidHome, { force: true, recursive: true });
    }
  });

  it('does not treat generic Android tooling as Google-auth ready without a Play Store AVD', () => {
    const androidHome = mkdtempSync(join(tmpdir(), 'coupl-android-home-'));
    try {
      const result = runPreflightWithFakeTools({
        androidHome,
        avdOutput: [
          'Available Android Virtual Devices:',
          '    Name: coupl_android_35',
          '  Target: Default Android System Image',
          '          Based on: Android 15.0 Tag/ABI: default/arm64-v8a',
        ].join('\n'),
      });

      expect(result.native.android).toMatchObject({
        adbAvailable: true,
        emulatorAvailable: true,
        avdmanagerAvailable: true,
        playStoreAvdAvailable: false,
        googleAuthReady: false,
        ready: false,
      });
      expect(result.releaseReady).toBe(false);
    } finally {
      rmSync(androidHome, { force: true, recursive: true });
    }
  });

  it('reports native release readiness when production Android signing credentials and API health are present', async () => {
    const androidHome = mkdtempSync(join(tmpdir(), 'coupl-android-home-'));
    const signingDir = mkdtempSync(join(tmpdir(), 'coupl-android-signing-'));
    const storeFile = join(signingDir, 'release.keystore');
    const healthPayload = JSON.stringify({
      ok: true,
      routes: { push: true, memories: true, account: true },
      instantAdminConfigured: true,
    });
    writeFileSync(storeFile, 'fake-keystore');

    try {
      const result = await withAndroidPlayServiceAccount(() =>
        runPreflightWithFakeTools({
          androidHome,
          avdOutput: [
            'Available Android Virtual Devices:',
            '    Name: coupl_android_35_play',
            '  Target: Google Play (Google Inc.)',
            '          Based on: Android 15.0 Tag/ABI: google_apis_playstore/arm64-v8a',
          ].join('\n'),
          extraEnv: {
            EXPO_PUBLIC_API_URL: 'https://127.0.0.1',
            PACTO_QA_MOCK_API_HEALTH: '1',
            PACTO_QA_API_HEALTH_PAYLOAD: healthPayload,
            PACTO_ANDROID_RELEASE_STORE_FILE: storeFile,
            PACTO_ANDROID_RELEASE_STORE_PASSWORD: 'store-password',
            PACTO_ANDROID_RELEASE_KEY_ALIAS: 'release',
            PACTO_ANDROID_RELEASE_KEY_PASSWORD: 'key-password',
          },
        }),
      );

      expect(result.native.android.releaseSigning).toMatchObject({
        configured: true,
        usesDebugKeystore: false,
        credentialsPresent: true,
        storeFileExists: true,
        ready: true,
      });
      expect(result.native.releaseConfig.ready).toBe(true);
      expect(result.native.android.ready).toBe(true);
      expect(result.server).toMatchObject({
        apiHealthOk: true,
        trustedPushReady: true,
        mediaApiReady: true,
        ready: true,
      });
      expect(result.releaseReady).toBe(true);
    } finally {
      rmSync(androidHome, { force: true, recursive: true });
      rmSync(signingDir, { force: true, recursive: true });
    }
  });

  it('flags missing Android release signing credentials without using the debug keystore', () => {
    const result = runPreflight({
      EXPO_PUBLIC_INSTANT_APP_ID: 'staging-app-id',
      INSTANT_ADMIN_TOKEN: 'admin-secret-token',
      PACTO_QA_ENV: 'staging',
      PACTO_QA_CONFIRM_APP_ID: 'staging-app-id',
      PACTO_QA_ALLOW_STAGING_WRITES: '1',
    });

    expect(result.native.android.releaseSigning).toMatchObject({
      configured: true,
      usesDebugKeystore: false,
      credentialsPresent: false,
      ready: false,
    });
    expect(result.native.android.missing).toContain('PACTO_ANDROID_RELEASE_STORE_FILE');
    expect(result.native.android.missing).toContain('PACTO_ANDROID_RELEASE_STORE_PASSWORD');
    expect(result.native.android.missing).toContain('PACTO_ANDROID_RELEASE_KEY_ALIAS');
    expect(result.native.android.missing).toContain('PACTO_ANDROID_RELEASE_KEY_PASSWORD');
    expect(result.releaseReady).toBe(false);
  });
});

const TEST_CERT = `-----BEGIN CERTIFICATE-----
MIICyTCCAbGgAwIBAgIJANOP8H9xP+hQMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNV
BAMMCTEyNy4wLjAuMTAeFw0yNjA1MjcyMDM0MjVaFw0yNjA1MjgyMDM0MjVaMBQx
EjAQBgNVBAMMCTEyNy4wLjAuMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBAN1zq1RQWsxaoqW2jMIbvOikDLarnAftIjcANZlp1bvVwsXza/2nx7sikK+p
zDMm9op9pVjCL0Xgo79x3/PFD0ZWw1qT+CWkgy84sbKUsO5R1dpmTtodYg6g0V3V
YNI7KPQGg7aB6+SBnQvtOaCxFxFODJ58OX7ZHIcmJzrt/0+pkjpJu5UByHwWla0Z
XFUvoK6Vrg/kHLUHZ8Y5wDtcNj8aXVmxXhvZpRB6azm1nHU1HCisHsZs+LAOquVl
v+2S/HD5oF22qmCojWwk3VyLrXxMEdb54nRif7uWvPRvkqADz7qNazrK2IVmh2aD
xKVVjxqZJnwv/B8ZZw/42wJWFosCAwEAAaMeMBwwGgYDVR0RBBMwEYIJMTI3LjAu
MC4xhwR/AAABMA0GCSqGSIb3DQEBCwUAA4IBAQBN3fgAT4CpuLx28pyxzGTgfIvg
bMaHsmaR5kB5MVstVDWlL5n8+TCzDcfj5HRTcyHmWlO4lT9t1+g0SqQUpxM4IekB
OcJWwejQIejJOSzlt5khovnXaEfnGtYCmkvScN7+E75vUL0BJECVCBleaCMEr/Be
Occajt13lT7gj5QvGJtutUx8ikF5XyKoYGbXi9Gj0sWlanNcJmD5fjIYCxhJ6daO
Y/SFMbSuHNm+lzQK8UFO/mLefX+e0W0j0T8GHU6EjKmxrM4PrhJYUMHMu75opvLu
Yjhub2NXb95lKFWiz7sPY13FIORwf/bTkEEWn7NZzLJVTB8zPdIk9HJr1ETy
-----END CERTIFICATE-----
`

const TEST_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDdc6tUUFrMWqKl
tozCG7zopAy2q5wH7SI3ADWZadW71cLF82v9p8e7IpCvqcwzJvaKfaVYwi9F4KO/
cd/zxQ9GVsNak/glpIMvOLGylLDuUdXaZk7aHWIOoNFd1WDSOyj0BoO2gevkgZ0L
7TmgsRcRTgyefDl+2RyHJic67f9PqZI6SbuVAch8FpWtGVxVL6Cula4P5By1B2fG
OcA7XDY/Gl1ZsV4b2aUQems5tZx1NRworB7GbPiwDqrlZb/tkvxw+aBdtqpgqI1s
JN1ci618TBHW+eJ0Yn+7lrz0b5KgA8+6jWs6ytiFZodmg8SlVY8amSZ8L/wfGWcP
+NsCVhaLAgMBAAECggEBANsJK69Lg2OZSkLKGtNriCA7EvAjMUONw0fPhzRkwCj3
t5z/thLAPwfTmnSFaBo4MaatvDvcZdGh7ZTQV4jPotoZu0P+E3V4EOFGHEzcUVyH
yRQqGVgXtANwAWXkRc3rAgjL4L9GJkJwCRvg2h0czAorvsOLb3sN1++9RxQ8j0kE
Qu/NS24KMqhmRw22IbxYpslgCrDM+U0BUU7pnbYmI/2qYIl2foiXx3G5Wlq6wGLP
seBfZKCDLtsVwNeNt4wPq9EhiSsNf0HNm9SQ7U3oCP7TW7AYwzLFNrxDEHYWHe1Z
UfbxQsPBNZmiT53otv2psul3dXitAHaL7uy5q2aqu3ECgYEA9wEUEH2LhUlOQ8RF
VwOFAOPUtN59XFEhsETXCcL9IfO3MRxNy4Yf5A0Cn/1Xsppe8HyLmvB8aguXXtbB
tOXvKIHhEX5hfx0QNm3vcA00qqBqmILFhzWRChjHvfaSwSlPwEVp7oYx3Iu7gyv3
9d4FB4lMnFp/SAQiz6GYSmHGPZ0CgYEA5YRbBgvOH4zCVcOW+ZyJDQVfo6f917Dn
4TmDVNJB7NeLtxzf2zk7eMR3R7l9yaNrh45UIs9skyrRZ3G30RQ7u7rJT4wgb+Gs
XTVehAnl/r+OHlTz/nBxdF3KtExjQGSgZUxKVVfML2xQ3YpsQeH4LpX1KX4FwCsP
FkeBjoRXAEcCgYAPxeDbILk9HK5Dw4/N+6qNoP7fQentcDzffbXhqLLzbRXArBcH
rRvyOyZ0wv/LpvHzF3Duxvaa6vySkNIz1A8OniSaMmDVdiyn3SNSG3XGg5HrBUbJ
2JDXfTecGNfMP/AYzhXypl0ewUmLGc6uw6u8jHb48Qp5tdHnQmFwNogrPQKBgQCi
nANhZTvEXpXQ7aIpdx4ie4wnBv5xsoSWrYi+r7jFdHEoauyvBP19srRPvLvCAGZO
xCgYAZ2LJur1vzvchdlMSCoYkc7pdZoI76bnJZwtwMmP8+BqhH/dUhYrZ3NqS+DX
5BVGIc4oSzV/wHKyusZ7OwNXQlIQtHEb981yi5CYQQKBgQDkBXWQcGQhpe6iczQ/
9vgmW7wu+N94w43ns0xmMUu1cf90rvLMAD9oQLELPgQmspWMPIlVzesHj5XObfxc
Y3H8smhOFDJu3i7ezbwULpROVi+sTj6pPiSB0pmd9RAUqPxaOKbi8WE52b9Kh52+
8BhVhpq/R9t6cYkiVQj9aoqDiA==
-----END PRIVATE KEY-----
`
