import { useRouter, useSegments } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useSession } from './session';

export function SessionGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const segments = useSegments();
  const { status } = useSession();

  useEffect(() => {
    const group = segments[0] as string | undefined;      // '(auth)' | '(tabs)' | undefined
    const leaf = segments[segments.length - 1] as string | undefined;

    if (status === 'loading') return;

    if (status === 'unauthed' && group !== '(auth)') {
      router.replace('/(auth)/sign-in' as any);
      return;
    }

    if (status === 'onboarding') {
      const allowed = group === '(auth)' && (leaf === 'onboarding' || leaf === 'invite' || leaf === 'invite-code');
      if (!allowed) router.replace('/(auth)/onboarding' as any);
      return;
    }

    if (status === 'ready' && group === '(auth)') {
      // Allow ready users to revisit invite-code (e.g. after upgrading solo→couple
      // or regenerating from profile).
      if (leaf === 'invite-code') return;
      router.replace('/(tabs)/home' as any);
      return;
    }
  }, [status, segments, router]);

  if (status === 'loading') {
    return <View style={{ flex: 1 }} />;
  }

  return <>{children}</>;
}
