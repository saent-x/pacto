import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';

export default function Index() {
  const { session, profile } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.couple_id) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
