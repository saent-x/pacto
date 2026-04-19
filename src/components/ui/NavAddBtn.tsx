import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Icon, IconName } from './Icon';

export function NavAddBtn({
  href,
  icon = 'plus',
}: {
  href: string;
  icon?: IconName;
}) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(href as any)}
      hitSlop={12}
      style={{ padding: 4 }}
    >
      <Icon name={icon} size={22} color={C.bone} strokeWidth={2.4} />
    </Pressable>
  );
}
