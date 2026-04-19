import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Icon, IconName } from './Icon';

type Mode = 'home' | 'back';

export function HeaderLeft({ mode }: { mode: Mode }) {
  const { C } = useTheme();

  let icon: IconName;
  let onPress: () => void;

  if (mode === 'home') {
    icon = 'bell';
    onPress = () => router.push('/notifications' as any);
  } else if (router.canGoBack()) {
    icon = 'chevronLeft';
    onPress = () => router.back();
  } else {
    icon = 'home';
    onPress = () => router.replace('/home');
  }

  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ padding: 4 }}>
      <Icon name={icon} size={22} color={C.bone} strokeWidth={2.4} />
    </Pressable>
  );
}
