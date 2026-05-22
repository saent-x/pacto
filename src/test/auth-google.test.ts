import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Google auth runtime selection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('falls back to browser OAuth in Expo Go before loading the native Google module', async () => {
    const signInWithOAuth = vi.fn(async () => undefined);

    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.doMock('expo-constants', () => ({ default: { appOwnership: 'expo' } }));
    vi.doMock('../lib/oauth', () => ({ signInWithOAuth }));
    vi.doMock('../lib/db', () => ({ db: { auth: { signInWithIdToken: vi.fn() } } }));
    vi.doMock('@react-native-google-signin/google-signin', () => {
      throw new Error('native Google module should not load in Expo Go');
    });

    const { signInWithGoogle } = await import('../lib/auth-google');

    await signInWithGoogle();

    expect(signInWithOAuth).toHaveBeenCalledWith('google');
  });

  it('uses the native Google module in custom Android builds', async () => {
    const signInWithOAuth = vi.fn(async () => undefined);
    const signInWithIdToken = vi.fn(async () => undefined);
    const configure = vi.fn();
    const hasPlayServices = vi.fn(async () => undefined);
    const signIn = vi.fn(async () => ({ data: { idToken: 'google-id-token' } }));

    vi.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    vi.doMock('expo-constants', () => ({ default: { appOwnership: null } }));
    vi.doMock('../lib/oauth', () => ({ signInWithOAuth }));
    vi.doMock('../lib/db', () => ({ db: { auth: { signInWithIdToken } } }));
    vi.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: { configure, hasPlayServices, signIn },
      isCancelledResponse: () => false,
      isSuccessResponse: () => true,
    }));

    const { signInWithGoogle } = await import('../lib/auth-google');

    await signInWithGoogle();

    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(configure).toHaveBeenCalledWith({
      iosClientId: expect.stringContaining('.apps.googleusercontent.com'),
      webClientId: expect.stringContaining('.apps.googleusercontent.com'),
    });
    expect(hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(signInWithIdToken).toHaveBeenCalledWith({
      clientName: 'google-android',
      idToken: 'google-id-token',
    });
  });
});
