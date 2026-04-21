import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSession } from '@/src/lib/session';

export default function Index() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthed') router.replace('/(auth)/sign-in' as any);
    else if (status === 'onboarding') router.replace('/(auth)/onboarding' as any);
    else if (status === 'ready') router.replace('/(tabs)/home' as any);
  }, [status, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0B0A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#E4B24A', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        BOOTING
      </Text>
      <Text style={{ color: '#F5EEE3', fontSize: 22, fontWeight: '700', marginBottom: 8 }}>
        coupl.
      </Text>
      <Text style={{ color: '#B3A89A', fontSize: 13 }}>
        session status: {status}
      </Text>
    </View>
  );
}
