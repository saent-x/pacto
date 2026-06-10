import React from 'react';
import { View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useColors, useTheme } from '@/theme';
import { Icon, Press, glassOK } from '@/ui';
import { useAI } from './AIController';
import { PulseRing } from './VoiceViz';

const impact = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

export function AIFab({ size = 54 }: { size?: number }) {
  const C = useColors();
  const { isDark } = useTheme();
  const { mode, viz, state, begin, end, toggleLive } = useAI();

  // state.live is true while recording (Whisper hold) or in a live session (Realtime).
  const icon = state.live ? 'mic' : 'sparkle';

  const circle = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <PulseRing active={viz} size={size} color={C.accent} />
      {glassOK ? (
        <GlassView
          glassEffectStyle="clear"
          isInteractive
          tintColor={C.accent}
          colorScheme={isDark ? 'dark' : 'light'}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Icon name={icon} size={24} color={C.onAccent} strokeWidth={1.7} />
        </GlassView>
      ) : (
        <View
          style={
            {
              width: size,
              height: size,
              borderRadius: size,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.accent,
              boxShadow: `0px 10px 26px ${C.accent}55`,
            } as object
          }
        >
          <Icon name={icon} size={24} color={C.onAccent} strokeWidth={1.7} />
        </View>
      )}
    </View>
  );

  // Realtime: tap to start/stop a live conversation.
  if (mode === 'live') {
    return (
      <Press
        onPress={() => {
          impact();
          toggleLive();
        }}
        accessibilityLabel="Pacto assistant"
        accessibilityRole="button"
        accessibilityHint="Double-tap to start or stop a live conversation"
        scale={0.94}
        style={{ borderRadius: size }}
      >
        {circle}
      </Press>
    );
  }

  // Whisper: press-and-hold to record (press-in starts, release sends).
  // The role is passed explicitly — with only pressIn/pressOut handlers Press
  // wouldn't default it, leaving the FAB invisible to VoiceOver. VoiceOver's
  // double-tap-and-hold pass-through gesture drives the existing handlers.
  return (
    <Press
      onPressIn={() => {
        impact();
        begin();
      }}
      onPressOut={() => end()}
      accessibilityLabel="Pacto assistant"
      accessibilityRole="button"
      accessibilityHint="Double-tap and hold to talk"
      scale={0.92}
      style={{ borderRadius: size }}
    >
      {circle}
    </Press>
  );
}
