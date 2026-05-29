import { createElement } from 'react';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INTRO_SEEN_KEY } from '@/src/lib/intro';
import { ONBOARDING_PAGES } from '@/src/lib/onboarding';

const routerSpy = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('expo-router', () => ({ useRouter: () => routerSpy }));

const pagerProps = vi.hoisted(() => ({ current: null as any }));
vi.mock('@/src/components/ui/pacto/OnboardingPager', () => ({
  OnboardingPager: (props: any) => {
    pagerProps.current = props;
    return null;
  },
}));
vi.mock('@/src/components/ui/pacto/onboarding-visuals', () => ({
  VISUALS: new Proxy({}, { get: () => () => null }),
}));

import Intro from '@/app/(auth)/intro';

const TestRenderer = require('react-test-renderer');

describe('intro onboarding', () => {
  beforeEach(() => {
    routerSpy.replace.mockClear();
    pagerProps.current = null;
  });

  it('passes every onboarding page to the pager', async () => {
    await act(async () => {
      TestRenderer.create(createElement(Intro));
    });
    expect(pagerProps.current.pages).toHaveLength(ONBOARDING_PAGES.length);
  });

  it('marks intro seen and routes to sign-in on finish', async () => {
    await act(async () => {
      TestRenderer.create(createElement(Intro));
    });
    await act(async () => {
      await pagerProps.current.onFinish();
    });
    expect(await AsyncStorage.getItem(INTRO_SEEN_KEY)).toBe('1');
    expect(routerSpy.replace).toHaveBeenCalledWith('/(auth)/sign-in');
  });
});
