import { useRouter } from 'expo-router';
import { createElement, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingPager, type PagerPage } from '@/src/components/ui/pacto/OnboardingPager';
import { VISUALS } from '@/src/components/ui/pacto/onboarding-visuals';
import { ONBOARDING_PAGES } from '@/src/lib/onboarding';
import { INTRO_SEEN_KEY } from '@/src/lib/intro';
import { useTheme } from '@/src/lib/theme';

export default function Intro() {
  const router = useRouter();
  const { C } = useTheme();

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {}
    router.replace('/(auth)/sign-in' as any);
  }, [router]);

  const pages = useMemo<PagerPage[]>(
    () =>
      ONBOARDING_PAGES.map((page) => ({
        key: page.key,
        eyebrow: page.eyebrow,
        title: page.title,
        body: page.body,
        accent: C[page.accentKey],
        visual: createElement(VISUALS[page.visual]),
      })),
    [C],
  );

  return <OnboardingPager pages={pages} onFinish={finish} onSkip={finish} />;
}
