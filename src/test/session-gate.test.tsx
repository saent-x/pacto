import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({ replace: vi.fn() }));
const routeState = vi.hoisted(() => ({
  segments: ['(tabs)', 'home'] as string[],
}));

vi.mock('expo-router', () => ({
  useRouter: () => routerSpy,
  useSegments: () => routeState.segments,
}));

const sessionState = vi.hoisted(() => ({ status: 'loading' as string }));
vi.mock('@/src/lib/session', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/src/components/ui/BootScreen', () => {
  const Reactx = require('react');
  return {
    BootScreen: ({ absolute }: { absolute?: boolean }) =>
      Reactx.createElement(
        'View',
        { testID: 'boot-screen', absolute },
        Reactx.createElement('View', { testID: 'boot-status' }, 'OPENING YOUR PACT'),
      ),
  };
});

import { SessionGate } from '@/src/lib/session-gate';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];
const allText = (root: any) =>
  root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .map((n: any) => n.children.join(''));

async function renderGate() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(
      <SessionGate>
        {React.createElement('Text', null, 'Loaded route')}
      </SessionGate>,
    );
    await flush();
  });
  return renderer;
}

describe('SessionGate', () => {
  beforeEach(() => {
    routerSpy.replace.mockClear();
    sessionState.status = 'loading';
    routeState.segments = ['(tabs)', 'home'];
  });

  it('uses the branded boot overlay while the session is loading', async () => {
    const renderer = await renderGate();

    expect(findByTestID(renderer.root, 'boot-screen')).toBeDefined();
    expect(findByTestID(renderer.root, 'boot-status')).toBeDefined();
    expect(allText(renderer.root).join(' ')).toContain('OPENING YOUR PACT');
    expect(allText(renderer.root).join(' ')).toContain('Loaded route');
    expect(routerSpy.replace).not.toHaveBeenCalled();

    act(() => renderer.unmount());
  });

  it('redirects ready users away from auth routes', async () => {
    sessionState.status = 'ready';
    routeState.segments = ['(auth)', 'onboarding'];
    const renderer = await renderGate();

    expect(routerSpy.replace).toHaveBeenCalledWith('/(tabs)/home');

    act(() => renderer.unmount());
  });
});
