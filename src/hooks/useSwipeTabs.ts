import { useMemo } from 'react';
import { PanResponder } from 'react-native';

type SwipeTabsOptions<T extends string> = {
  tabs: readonly T[];
  value: T;
  onChange: (next: T) => void;
};

export function useSwipeTabs<T extends string>({
  tabs,
  value,
  onChange,
}: SwipeTabsOptions<T>) {
  return useMemo(() => {
    const currentIndex = tabs.indexOf(value);

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dx) > 18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
      onPanResponderRelease: (_, gestureState) => {
        const shouldSwitch =
          Math.abs(gestureState.dx) > 56 || Math.abs(gestureState.vx) > 0.35;

        if (!shouldSwitch) {
          return;
        }

        if (gestureState.dx < 0 && currentIndex < tabs.length - 1) {
          onChange(tabs[currentIndex + 1]);
        }

        if (gestureState.dx > 0 && currentIndex > 0) {
          onChange(tabs[currentIndex - 1]);
        }
      },
    });
  }, [onChange, tabs, value]);
}
