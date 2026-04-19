import { useRouter, usePathname } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useSession } from './session';

export function SessionGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    const target = routeFor(status, pathname);
    if (target && target !== pathname) {
      router.replace(target as any);
    }
  }, [status, pathname, router]);

  if (status === 'loading') {
    return <View style={{ flex: 1 }} />;
  }

  return <>{children}</>;
}

function routeFor(status: string, pathname: string): string | null {
  if (status === 'loading') return null;

  if (status === 'unauthed') {
    return pathname.startsWith('/(auth)') ? null : '/(auth)/sign-in';
  }

  if (status === 'onboarding') {
    const allowed = ['/(auth)/onboarding', '/(auth)/invite', '/(auth)/invite-code'];
    return allowed.includes(pathname) ? null : '/(auth)/onboarding';
  }

  if (status === 'ready') {
    if (pathname.startsWith('/(auth)')) return '/(tabs)/home';
    return null;
  }

  return null;
}
