import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// Scale 0.96 on press via Pressable's `pressed` state.
// Pure RN — no Reanimated dependency, no worklets.
// Tradeoff: snap instead of spring, but always works.
export function PressScale({
  children,
  style,
  disabled,
  static: staticMode = false,
  ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  static?: boolean;
}) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={(state) => {
        const base =
          typeof style === 'function' ? (style as any)(state) : style;
        if (staticMode || disabled) return base;
        return [
          base,
          { transform: [{ scale: state.pressed ? 0.96 : 1 }] },
        ];
      }}
    >
      {children as any}
    </Pressable>
  );
}
