import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/src/lib/theme';

type Props = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  size?: number;
  color?: string;
};

/**
 * 7px-radius rounded square checkbox. Accent fill when checked.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (Checkbox)
 */
export function Checkbox({ checked, onChange, size = 22, color }: Props) {
  const { C } = useTheme();
  const accent = color ?? C.accent;
  const tickSize = size * 0.7;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        Haptics.selectionAsync().catch(() => undefined);
        onChange?.(!checked);
      }}
      hitSlop={6}
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: checked ? accent : C.line2,
        backgroundColor: checked ? accent : C.bgCard,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? (
        <Svg width={tickSize} height={tickSize} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12.5L10 17.5L19 7.5"
            stroke={C.bg}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}
