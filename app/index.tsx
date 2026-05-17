import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BootScreen } from '@/src/components/ui/BootScreen';
import { useSession } from '@/src/lib/session';

export default function Index() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthed') router.replace('/(auth)/sign-in' as any);
    else if (status === 'onboarding') router.replace('/(auth)/onboarding' as any);
    else if (status === 'ready') router.replace('/(tabs)/home' as any);
  }, [status, router]);

  return <BootScreen />;
}
