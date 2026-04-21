import { useTheme } from '@/src/lib/theme';
import { Icon } from './Icon';
import { PressScale } from './PressScale';

export function AddBtn({ onPress }: { onPress?: () => void }) {
  const { C } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.gold,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="plus" size={18} color={C.peachInk} strokeWidth={2.5} />
    </PressScale>
  );
}
