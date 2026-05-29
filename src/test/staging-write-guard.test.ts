import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertStagingWriteAllowed } from '../../scripts/lib/staging-write-guard.mjs';

describe('staging write guard', () => {
  it('rejects apply writes unless the environment is explicitly staging', () => {
    expect(() =>
      assertStagingWriteAllowed({
        appId: 'app-prod',
        operation: 'base solo backfill',
        env: {
          PACTO_QA_ENV: 'production',
          PACTO_QA_CONFIRM_APP_ID: 'app-prod',
          PACTO_QA_ALLOW_STAGING_WRITES: '1',
        },
      }),
    ).toThrow(/PACTO_QA_ENV=staging/);
  });

  it('rejects apply writes unless the confirmed app id matches the loaded Instant app id', () => {
    expect(() =>
      assertStagingWriteAllowed({
        appId: 'app-staging',
        operation: 'base solo backfill',
        env: {
          PACTO_QA_ENV: 'staging',
          PACTO_QA_CONFIRM_APP_ID: 'app-prod',
          PACTO_QA_ALLOW_STAGING_WRITES: '1',
        },
      }),
    ).toThrow(/PACTO_QA_CONFIRM_APP_ID/);
  });

  it('allows apply writes only when all staging confirmations are present', () => {
    expect(() =>
      assertStagingWriteAllowed({
        appId: 'app-staging',
        operation: 'base solo backfill',
        env: {
          PACTO_QA_ENV: 'staging',
          PACTO_QA_CONFIRM_APP_ID: 'app-staging',
          PACTO_QA_ALLOW_STAGING_WRITES: '1',
        },
      }),
    ).not.toThrow();
  });

  it('checks base-solo backfill apply safety before Instant admin initialization', () => {
    const script = readFileSync(path.join(process.cwd(), 'scripts/backfill-base-solo.mjs'), 'utf8');
    const guardCallIndex = script.indexOf('assertStagingWriteAllowed({');
    const initIndex = script.indexOf('init({ appId, adminToken })');

    expect(guardCallIndex).toBeGreaterThanOrEqual(0);
    expect(guardCallIndex).toBeLessThan(initIndex);
    expect(script).toContain("operation: 'base solo backfill'");
  });
});
