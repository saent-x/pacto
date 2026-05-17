import { router } from 'expo-router';
import { useTheme } from '@/src/lib/theme';
import { Icon, IconName } from './Icon';
import { PressScale } from './PressScale';

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
    <PressScale
      onPress={onPress}
      hitSlop={12}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={22} color={C.inkColor} strokeWidth={2.4} />
    </PressScale>
  );
}
