import { afterEach, describe, expect, it, vi } from 'vitest';

describe('health API route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // SEC-2: the health endpoint is unauthenticated, so it is a minimal liveness
  // probe only. It must NOT leak env values, route lists, versions, or any
  // config that would enable fingerprinting / route enumeration. It returns
  // 200 {ok:true} when the admin-backed routes can be served and 503 otherwise.
  it('returns a minimal healthy liveness probe without exposing secrets or config', async () => {
    vi.stubEnv('EXPO_PUBLIC_INSTANT_APP_ID', 'app-id');
    vi.stubEnv('INSTANT_ADMIN_TOKEN', 'admin-secret-token');
    const route = await import('../../app/api/health+api');

    const response = route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    // Exactly { ok: true } — no env values, route enumeration, or other config.
    expect(body).toEqual({ ok: true });
    expect(JSON.stringify(body)).not.toContain('admin-secret-token');
    expect(JSON.stringify(body)).not.toContain('app-id');
    expect(JSON.stringify(body)).not.toContain('routes');
  });

  it('fails health when the admin route environment is incomplete', async () => {
    vi.stubEnv('EXPO_PUBLIC_INSTANT_APP_ID', 'app-id');
    vi.stubEnv('INSTANT_ADMIN_TOKEN', '');
    const route = await import('../../app/api/health+api');

    const response = route.GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ ok: false });
  });
});
