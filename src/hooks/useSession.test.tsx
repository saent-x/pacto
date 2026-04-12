import React from 'react';
import type { ReactNode } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider, getSessionRoute, useSession } from '@/src/hooks/useSession';

const {
  mockUseAuthSession,
} = vi.hoisted(() => ({
  mockUseAuthSession: vi.fn(),
}));

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    useSession: mockUseAuthSession,
  },
}));

function renderSessionProvider(children: ReactNode) {
  act(() => {
    TestRenderer.create(<SessionProvider>{children}</SessionProvider>);
  });
}

describe('getSessionRoute', () => {
  beforeEach(() => {
    mockUseAuthSession.mockReset();
  });

  it('routes signed-out users to sign-in', () => {
    expect(
      getSessionRoute({
        isAuthenticated: false,
        hasActiveCouple: false,
      }),
    ).toBe('/(auth)/sign-in');
  });

  it('routes signed-in users without a couple to onboarding', () => {
    expect(
      getSessionRoute({
        isAuthenticated: true,
        hasActiveCouple: false,
      }),
    ).toBe('/(auth)/onboarding');
  });

  it('routes joined users into the main app', () => {
    expect(
      getSessionRoute({
        isAuthenticated: true,
        hasActiveCouple: true,
      }),
    ).toBe('/(tabs)/home');
  });

  it('shares one session subscription across consumers', () => {
    mockUseAuthSession.mockReturnValue({
      data: {
        session: { id: 'session_1' },
        user: { id: 'user_1', email: 'user@example.com' },
      },
      isPending: false,
    });

    const seenRoutes: Array<string | null> = [];

    function Consumer() {
      const session = useSession();
      seenRoutes.push(session.route);
      return null;
    }

    renderSessionProvider(
      <>
        <Consumer />
        <Consumer />
      </>,
    );

    expect(seenRoutes).toEqual(['/(auth)/onboarding', '/(auth)/onboarding']);
  });
});
