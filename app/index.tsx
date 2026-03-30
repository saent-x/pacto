import { Redirect } from 'expo-router';
import { useSession } from '@/src/hooks/useSession';

export default function Index() {
  const { isLoading, route } = useSession();

  if (isLoading || !route) {
    return null;
  }

  return <Redirect href={route} />;
}
