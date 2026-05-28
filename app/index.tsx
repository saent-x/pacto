import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BootScreen } from '@/src/components/ui/BootScreen';
import { useSession } from '@/src/lib/session';
import { INTRO_SEEN_KEY } from '@/src/lib/intro';

export default function Index() {
  const router = useRouter();
  const { status } = useSession();
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(INTRO_SEEN_KEY)
      .then((v) => setIntroSeen(v === '1'))
      .catch(() => setIntroSeen(false));
  }, []);

  useEffect(() => {
    if (introSeen === null) return;
    if (status === 'unauthed') {
      router.replace((introSeen ? '/(auth)/sign-in' : '/(auth)/intro') as any);
    } else if (status === 'onboarding') {
      router.replace('/(auth)/onboarding' as any);
    } else if (status === 'ready') {
      router.replace('/(tabs)/home' as any);
    }
  }, [status, router, introSeen]);

  return <BootScreen />;
}
