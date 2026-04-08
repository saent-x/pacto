import { Redirect } from 'expo-router';
import { useSession } from '@/src/hooks/useSession';

export default function Index() {
  const { route } = useSession();

  // AppSplash stays visible until route is known, so by the time
  // this mounts the route is always set. Redirect immediately.
  if (!route) {
    return null;
  }

  return <Redirect href={route} />;
}
