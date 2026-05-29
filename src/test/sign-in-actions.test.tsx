import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('expo-apple-authentication', () => {
  const Reactx = require('react');
  return {
    AppleAuthenticationButton: (props: any) =>
      Reactx.createElement('AppleAuthenticationButton', props),
    AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
    AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
    AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
    isAvailableAsync: vi.fn(async () => false),
    signInAsync: vi.fn(),
  };
});

vi.mock('@/src/components/ui/pacto', () => {
  const Reactx = require('react');
  return {
    Card: ({ children, style }: any) => Reactx.createElement('View', { style }, children),
    HeaderBrand: ({ title }: any) => Reactx.createElement('Text', null, title),
    PactoMark: () => null,
  };
});

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: any) => {
    const Reactx = require('react');
    return Reactx.createElement('Text', null, name);
  },
}));

const dbMock = vi.hoisted(() => ({
  auth: {
    sendMagicCode: vi.fn(async () => undefined),
    signInWithMagicCode: vi.fn(async () => undefined),
  },
}));

vi.mock('@/src/lib/db', () => ({ db: dbMock }));

const authMocks = vi.hoisted(() => ({
  isAppleSignInAvailable: vi.fn(async () => false),
  signInWithApple: vi.fn(async () => undefined),
  signInWithGoogle: vi.fn(async () => undefined),
  signInWithOAuth: vi.fn(async () => undefined),
}));

vi.mock('@/src/lib/auth-apple', () => ({
  isAppleSignInAvailable: authMocks.isAppleSignInAvailable,
  signInWithApple: authMocks.signInWithApple,
}));

vi.mock('@/src/lib/auth-google', () => ({
  signInWithGoogle: authMocks.signInWithGoogle,
}));

vi.mock('@/src/lib/oauth', () => ({
  signInWithOAuth: authMocks.signInWithOAuth,
}));

import SignIn from '@/app/(auth)/sign-in';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

const findByA11yLabel = (root: any, label: string) =>
  root.findAll((node: any) => node.props?.accessibilityLabel === label)[0];

async function renderSignIn() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<SignIn />);
    await flush();
  });
  return renderer;
}

describe('sign-in actions', () => {
  beforeEach(() => {
    dbMock.auth.sendMagicCode.mockClear();
    dbMock.auth.signInWithMagicCode.mockClear();
    authMocks.isAppleSignInAvailable.mockClear();
    authMocks.signInWithApple.mockClear();
    authMocks.signInWithGoogle.mockClear();
    authMocks.signInWithOAuth.mockClear();
    authMocks.isAppleSignInAvailable.mockResolvedValue(false);
    authMocks.signInWithGoogle.mockResolvedValue(undefined);
  });

  it('ignores duplicate Google sign-in presses while native sign-in is pending', async () => {
    let resolveGoogle: () => void = () => undefined;
    const googlePromise = new Promise<void>((resolve) => {
      resolveGoogle = resolve;
    });
    authMocks.signInWithGoogle.mockImplementation(() => googlePromise);
    const renderer = await renderSignIn();

    await act(async () => {
      const googleButton = findByA11yLabel(renderer.root, 'Continue with Google');
      googleButton.props.onPress();
      googleButton.props.onPress();
      await flush();
    });

    expect(authMocks.signInWithGoogle).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveGoogle();
      await flush();
    });
  });
});
