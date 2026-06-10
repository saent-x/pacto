import React, { forwardRef } from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useColors, useTheme } from '@/theme';
import { SHADOWS, TAB_BAR_H as BAR_H } from '@/theme/tokens';
import { useAI } from '@/features/ai/AIController';
import { AIFab } from '@/features/ai/AIFab';
import { Icon, type IconName } from './Icon';
import { T } from './Text';
import { glassOK } from './Glass';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Today', icon: 'home' },
  { name: 'tools', label: 'Tools', icon: 'grid' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
];

type TabButtonProps = TabTriggerSlotProps & { label: string; icon: IconName };

const TabButton = forwardRef<View, TabButtonProps>(
  ({ isFocused, label, icon, onPress, ...rest }, ref) => {
    const C = useColors();
    return (
      <Pressable
        ref={ref}
        onPress={(e) => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.(e);
        }}
        {...rest}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isFocused }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          paddingVertical: 10,
          paddingHorizontal: isFocused ? 16 : 13,
          borderRadius: 999,
          backgroundColor: isFocused ? C.ink : 'transparent',
        }}
      >
        <Icon name={icon} size={20} color={isFocused ? C.bg : C.ink3} strokeWidth={1.9} />
        {isFocused && (
          <T size={13.5} weight={600} color={C.bg} maxFontSizeMultiplier={1.2} style={{ letterSpacing: -0.2 }}>
            {label}
          </T>
        )}
      </Pressable>
    );
  },
);
TabButton.displayName = 'TabButton';

export function GlassTabBar() {
  const C = useColors();
  const { isDark } = useTheme();
  const scheme = isDark ? 'dark' : 'light';
  const insets = useSafeAreaInsets();
  const { overlayP, active, setPillW } = useAI();

  // Pill recedes while the AI overlay is open, leaving just the AI button.
  const pillFade = useAnimatedStyle(() => ({ opacity: 1 - overlayP.value }));

  const pillStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_H,
    borderRadius: 999,
    paddingHorizontal: 7,
    gap: 4,
    overflow: 'hidden',
  };
  const pillFallback = {
    backgroundColor: C.surface,
    boxShadow: SHADOWS.tabBar,
  } as unknown as ViewStyle;

  const triggers = TABS.map((t) => (
    <TabTrigger key={t.name} name={t.name} asChild>
      <TabButton label={t.label} icon={t.icon} />
    </TabTrigger>
  ));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 11,
      }}
    >
      <Animated.View
        style={pillFade}
        pointerEvents={active ? 'none' : 'auto'}
        onLayout={(e) => setPillW(e.nativeEvent.layout.width)}
      >
        {glassOK ? (
          <GlassView glassEffectStyle="clear" isInteractive colorScheme={scheme} style={pillStyle}>
            {triggers}
          </GlassView>
        ) : (
          <View style={[pillStyle, pillFallback]}>{triggers}</View>
        )}
      </Animated.View>

      <AIFab size={BAR_H} />
    </View>
  );
}
