import { router } from 'expo-router';
import { useTheme } from '@/src/lib/theme';
import { Icon, IconName } from './Icon';
import { PressScale } from './PressScale';

export function NavAddBtn({
  href,
  icon = 'plus',
}: {
  href: string;
  icon?: IconName;
}) {
  const { C } = useTheme();
  return (
    <PressScale
      onPress={() => router.push(href as any)}
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
