import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useColors } from '@/theme';
import { TAB_BAR_H as BAR_H } from '@/theme/tokens';
import { T, Kick, Glass, RoundBtn } from '@/ui';
import { useAI } from './AIController';
import { Waveform } from './VoiceViz';
import type { AIMessage } from './useRealtimeAgent';

function Bubble({ m }: { m: AIMessage }) {
  const C = useColors();
  if (m.role === 'tool') {
    return (
      <View
        style={{
          alignSelf: 'center',
          backgroundColor: C.accentSoft,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 5,
        }}
      >
        <Kick color={C.accent}>{`✓ ${m.text}`}</Kick>
      </View>
    );
  }
  const you = m.role === 'user';
  return (
    <View
      style={{
        alignSelf: you ? 'flex-end' : 'flex-start',
        maxWidth: '84%',
        backgroundColor: you ? C.accent : C.surface,
        borderRadius: 20,
        borderBottomRightRadius: you ? 6 : 20,
        borderBottomLeftRadius: you ? 20 : 6,
        paddingHorizontal: 15,
        paddingVertical: 11,
      }}
    >
      <T size={15} weight={450} lh={1.45} color={you ? C.onAccent : C.ink}>
        {m.text || '…'}
      </T>
    </View>
  );
}

function hintFor(mode: 'hold' | 'live', status: string, live: boolean, error: string | null) {
  if (error) return error;
  if (mode === 'live') {
    if (status === 'connecting') return 'Connecting…';
    if (live) return 'Listening — tap to end';
    return 'Tap to start a conversation';
  }
  if (status === 'recording') return 'Listening… release to send';
  if (status === 'thinking') return 'Thinking…';
  return 'Hold to talk';
}

export function AIDock() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { active, state, mode, viz, level, overlayP, pillW, close } = useAI();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (state.messages.length) scrollRef.current?.scrollToEnd({ animated: true });
  }, [state.messages]);

  const tintStyle = useAnimatedStyle(() => ({ opacity: overlayP.value * 0.8 }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: overlayP.value }));

  const hint = hintFor(mode, state.status, state.live, state.error);

  return (
    <View pointerEvents={active ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      {/* Tint scrim — tap to dismiss */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }, tintStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* soft accent glow bottom-right, behind the button — a radial falloff so
          the light spreads and dissolves into the background instead of reading
          as a hard-edged disc */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', right: -170, bottom: -170, width: 500, height: 500 },
          useAnimatedStyle(() => ({ opacity: overlayP.value })),
        ]}
      >
        <Svg width={500} height={500}>
          <Defs>
            <RadialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.accent} stopOpacity={0.26} />
              <Stop offset="0.45" stopColor={C.accent} stopOpacity={0.1} />
              <Stop offset="0.75" stopColor={C.accent} stopOpacity={0.03} />
              <Stop offset="1" stopColor={C.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={500} height={500} fill="url(#aiGlow)" />
        </Svg>
      </Animated.View>

      {/* Close affordance — keeps the tab bar from being a silent trap */}
      <Animated.View
        pointerEvents={active ? 'auto' : 'none'}
        style={[
          { position: 'absolute', top: insets.top + 8, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
          fadeStyle,
        ]}
      >
        <Kick color={C.ink3}>Close</Kick>
        <RoundBtn name="x" onPress={close} />
      </Animated.View>

      {/* Transcript — stays mounted and fades with overlayP so it doesn't pop on close */}
      {state.messages.length > 0 && (
        <Animated.View
          pointerEvents={active ? 'box-none' : 'none'}
          style={[
            {
              position: 'absolute',
              left: 16,
              right: 16,
              top: insets.top + 60,
              bottom: insets.bottom + 10 + BAR_H + 86,
            },
            fadeStyle,
          ]}
        >
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', gap: 10, paddingVertical: 8 }}
          >
            {state.messages.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Hint */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 10 + BAR_H + 70, alignItems: 'center' },
          fadeStyle,
        ]}
      >
        <T size={14.5} weight={600} color={C.ink2}>
          {hint}
        </T>
      </Animated.View>

      {/* Voice examples */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + 10 + BAR_H + 36,
            alignItems: 'center',
          },
          fadeStyle,
        ]}
      >
        {state.messages.length === 0 && (
          <Kick color={C.ink3} style={{ textAlign: 'center' }}>
            Try saying “remind me at 6” or “show open tasks”
          </Kick>
        )}
      </Animated.View>

      {/* Waveform — mirrors the tab bar row, sitting left of the AI button */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 10,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 11,
          },
          fadeStyle,
        ]}
      >
        <Glass
          tintColor={C.accent}
          fallbackStyle={{ backgroundColor: C.surface }}
          style={{
            height: BAR_H,
            // Match the measured tab-pill width so the bar sits exactly where the
            // pill was (and the AI button lines up), falling back to intrinsic width.
            width: pillW > 0 ? pillW : undefined,
            borderRadius: 999,
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Waveform
            level={level}
            active={viz}
            mode={mode === 'live' ? 'pulse' : 'level'}
            color={C.accent}
            bars={16}
            height={28}
            width={3.5}
            gap={3.5}
          />
        </Glass>
        {/* spacer aligning the waveform to the left of the AI button */}
        <View style={{ width: BAR_H }} />
      </Animated.View>
    </View>
  );
}
