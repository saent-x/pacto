import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useAiAssistant } from './ai';
import { useTheme } from './theme';

/**
 * White → violet radial torch. Bright white center bleeds into purple,
 * fading fully transparent at the edge — no hard disc outline.
 *
 * Variants:
 *   - 'core' : hot white core → violet, slightly off-center for refraction
 *   - 'halo' : pure violet wash, no white center — used for outer glow rings
 */
type GlowVariant = 'core' | 'halo';

const TorchGlow = React.memo(function TorchGlow({
  variant = 'core',
  id,
}: {
  variant?: GlowVariant;
  /** Unique id so multiple instances don't collide on the gradient ref. */
  id: string;
}) {
  const gradId = `torch-${id}`;
  return (
    <Svg style={StyleSheet.absoluteFill as any} pointerEvents="none">
      <Defs>
        {variant === 'core' ? (
          <RadialGradient id={gradId} cx="48%" cy="46%" r="55%" fx="48%" fy="46%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.88} />
            <Stop offset="22%" stopColor="#FFFFFF" stopOpacity={0.42} />
            <Stop offset="48%" stopColor="#B8A8E8" stopOpacity={0.30} />
            <Stop offset="75%" stopColor="#7B5CD9" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#7B5CD9" stopOpacity={0} />
          </RadialGradient>
        ) : (
          <RadialGradient id={gradId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#B8A8E8" stopOpacity={0.32} />
            <Stop offset="45%" stopColor="#B8A8E8" stopOpacity={0.16} />
            <Stop offset="80%" stopColor="#7B5CD9" stopOpacity={0.04} />
            <Stop offset="100%" stopColor="#7B5CD9" stopOpacity={0} />
          </RadialGradient>
        )}
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
    </Svg>
  );
});

const LISTENING_DOTS = Array.from({ length: 231 }, (_, index) => {
  const columns = 21;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const centerColumn = (columns - 1) / 2;
  const centerRow = 5;
  const distance = Math.hypot(column - centerColumn, row - centerRow);

  return {
    key: `dot-${index}`,
    left: `${(column / (columns - 1)) * 100}%` as const,
    top: `${(row / 10) * 100}%` as const,
    opacity: Math.max(0.08, 0.34 - distance * 0.025),
  };
});

// Assistant visuals are intentionally isolated in this file. Reverting this
// file restores the previous overlay direction without touching AI behavior.
const ASSISTANT_VISUAL = {
  scrim: 'rgba(42, 36, 27, 0.68)',
  ink: '#2A241B',
  ink2: '#5C5345',
  warm: '#D08B6F',
  mint: '#7FBFAF',
};

type AssistantOverlayContextValue = {
  isVoiceOverlayOpen: boolean;
  openVoiceOverlay: () => void;
  closeVoiceOverlay: () => void;
};

const AssistantOverlayContext = createContext<AssistantOverlayContextValue>({
  isVoiceOverlayOpen: false,
  openVoiceOverlay: () => undefined,
  closeVoiceOverlay: () => undefined,
});

export function AssistantOverlayProvider({
  children,
  processAudioRecording,
}: {
  children: React.ReactNode;
  processAudioRecording?: (audioUri: string) => Promise<void>;
}) {
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);
  const assistant = useAiAssistant();

  const openVoiceOverlay = useCallback(() => {
    assistant.startVoiceTurn();
    setIsVoiceOverlayOpen(true);
  }, [assistant]);

  const closeVoiceOverlay = useCallback(() => {
    setIsVoiceOverlayOpen(false);
  }, []);

  const value = useMemo(
    () => ({ isVoiceOverlayOpen, openVoiceOverlay, closeVoiceOverlay }),
    [closeVoiceOverlay, isVoiceOverlayOpen, openVoiceOverlay],
  );

  return (
    <AssistantOverlayContext.Provider value={value}>
      {children}
      <AssistantVoiceOverlay
        visible={isVoiceOverlayOpen}
        onClose={closeVoiceOverlay}
        onCancel={assistant.cancelPendingActions}
        onConfirm={assistant.confirmPendingActions}
        processAudioRecording={processAudioRecording ?? assistant.processAudioRecording}
        turn={assistant.turn}
      />
    </AssistantOverlayContext.Provider>
  );
}

export function useAssistantOverlay() {
  return useContext(AssistantOverlayContext);
}

function AssistantVoiceOverlay({
  visible,
  onClose,
  onCancel,
  onConfirm,
  processAudioRecording,
  turn,
}: {
  visible: boolean;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  processAudioRecording: (audioUri: string) => Promise<void>;
  turn: ReturnType<typeof useAiAssistant>['turn'];
}) {
  const { C, F } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const startRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  useEffect(() => {
    if (!visible) return;
    startRecording().catch(() => undefined);
    return () => {
      if (recorder.isRecording) {
        recorder.stop().catch(() => undefined);
      }
    };
  }, [recorder, startRecording, visible]);

  const submitRecording = useCallback(async () => {
    await recorder.stop();
    if (recorder.uri) {
      await processAudioRecording(recorder.uri);
    }
  }, [processAudioRecording, recorder]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View
        testID="pacto-ai-voice-overlay"
        style={[
          styles.overlay,
          {
            backgroundColor: ASSISTANT_VISUAL.scrim,
            paddingBottom: 0,
          },
        ]}
      >
        <Pressable
          testID="pacto-ai-overlay-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Dismiss Pacto AI"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.centerStack, { paddingBottom: Math.max(insets.bottom + 52, height * 0.08) }]}>
          <View
            testID="pacto-ai-voice-pill"
            style={styles.listeningSurface}
          >
            <ListeningAura />

            <Pressable
              testID="pacto-ai-submit-recording"
              accessibilityRole="button"
              accessibilityLabel="Submit Pacto AI recording"
              onPress={submitRecording}
              hitSlop={20}
              style={({ pressed }) => [
                styles.listeningTarget,
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.listeningText,
                  {
                    color: 'rgba(250,248,242,0.92)',
                    fontFamily: F.geistMonoMedium,
                  },
                ]}
              >
                {labelForState(turn.state)}
              </Text>
              <VoiceMeter active={recorderState.isRecording} />
            </Pressable>
          </View>

          <View style={styles.messageStack}>
            {turn.messages.map((message) => {
              const isUser = message.from === 'user';
              return (
                <View
                  key={message.id}
                  testID="pacto-ai-message"
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userMessage : styles.assistantMessage,
                    {
                      borderColor: isUser ? 'rgba(127,191,175,0.62)' : 'rgba(255,255,255,0.32)',
                      backgroundColor: isUser ? 'rgba(220,237,231,0.96)' : 'rgba(250,248,242,0.97)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageLabel,
                      {
                        color: isUser ? ASSISTANT_VISUAL.ink2 : ASSISTANT_VISUAL.warm,
                        fontFamily: F.geistMonoMedium,
                      },
                    ]}
                  >
                    {isUser ? 'You' : message.from === 'system' ? 'System' : 'Pacto AI'}
                  </Text>
                  <Text style={[styles.messageBody, { color: ASSISTANT_VISUAL.ink, fontFamily: F.geistMedium }]}>
                    {message.body}
                  </Text>
                </View>
              );
            })}

            {turn.pendingActions.map((action) => (
              <View
                key={action.id}
                testID="pacto-ai-action-preview"
                style={[
                  styles.actionCard,
                  {
                    borderColor: action.destructive ? C.error : 'rgba(250,248,242,0.72)',
                    backgroundColor: 'rgba(250,248,242,0.97)',
                  },
                ]}
              >
                <Text style={[styles.messageLabel, { color: action.destructive ? C.error : ASSISTANT_VISUAL.warm, fontFamily: F.geistMonoMedium }]}>
                  preview
                </Text>
                <Text style={[styles.actionTitle, { color: ASSISTANT_VISUAL.ink, fontFamily: F.geistMedium }]}>
                  {action.title}
                </Text>
                <Text style={[styles.actionSummary, { color: ASSISTANT_VISUAL.ink2, fontFamily: F.geistMedium }]}>
                  {action.summary}
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                    testID="pacto-ai-cancel-action"
                    accessibilityRole="button"
                    accessibilityLabel="Cancel Pacto AI action"
                    onPress={onCancel}
                    style={[styles.actionButton, styles.secondaryAction]}
                  >
                    <Text style={[styles.actionButtonText, { color: ASSISTANT_VISUAL.ink, fontFamily: F.geistMonoMedium }]}>
                      cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="pacto-ai-confirm-action"
                    accessibilityRole="button"
                    accessibilityLabel="Confirm Pacto AI action"
                    onPress={onConfirm}
                    style={[styles.actionButton, { backgroundColor: ASSISTANT_VISUAL.mint }]}
                  >
                    <Text style={[styles.actionButtonText, { color: '#10201D', fontFamily: F.geistMonoMedium }]}>
                      confirm
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function labelForState(state: ReturnType<typeof useAiAssistant>['turn']['state']) {
  if (state === 'transcribing') return 'transcribing';
  if (state === 'thinking') return 'thinking';
  if (state === 'awaitingConfirmation') return 'review';
  if (state === 'applying') return 'applying';
  if (state === 'error') return 'needs attention';
  if (state === 'complete') return 'ready';
  return 'listening';
}

function VoiceMeter({ active }: { active: boolean }) {
  const values = useRef(
    Array.from({ length: 9 }, (_, index) => new Animated.Value(index % 2 ? 0.35 : 0.7)),
  ).current;

  useEffect(() => {
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 58),
          Animated.timing(value, {
            toValue: active ? (index % 3 === 0 ? 0.82 : 1) : 0.48,
            duration: 220 + index * 22,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: active ? (index % 2 ? 0.28 : 0.52) : 0.36,
            duration: 260 + index * 24,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [active, values]);

  return (
    <View testID="pacto-ai-listening-meter" style={styles.listeningMeter}>
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.meterBar,
            {
              opacity: value.interpolate({
                inputRange: [0.35, 1],
                outputRange: [0.5, 1],
              }),
              transform: [
                {
                  scaleY: value.interpolate({
                    inputRange: [0.28, 1],
                    outputRange: [0.24, 2.15],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function ListeningAura() {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, spin]);

  return (
    <View testID="pacto-ai-voice-wave" style={[styles.auraField, styles.nonInteractive]}>
      <View testID="pacto-ai-listening-dots" style={styles.dotField}>
        {LISTENING_DOTS.map((dot) => (
          <View
            key={dot.key}
            style={[
              styles.dot,
              {
                left: dot.left,
                top: dot.top,
                opacity: dot.opacity,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        testID="pacto-ai-listening-ring"
        pointerEvents="none"
        style={[
          styles.outerRing,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.46],
            }),
            transform: [
              {
                scaleX: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1.08],
                }),
              },
              {
                scaleY: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.08, 0.86],
                }),
              },
            ],
          },
        ]}
      >
        <TorchGlow variant="halo" id="ring" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gasCloudViolet,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.16, 0.4],
            }),
            transform: [
              {
                translateX: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-24, 38],
                }),
              },
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.1],
                }),
              },
            ],
          },
        ]}
      >
        <TorchGlow variant="halo" id="violet" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gasCloudBlue,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.34],
            }),
            transform: [
              {
                translateX: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [42, -30],
                }),
              },
              {
                translateY: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, -12],
                }),
              },
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.02, 0.88],
                }),
              },
            ],
          },
        ]}
      >
        <TorchGlow variant="halo" id="cool" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.innerGlow,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.74, 1],
            }),
            transform: [
              {
                scaleX: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.72, 1.04],
                }),
              },
              {
                scaleY: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.14, 0.82],
                }),
              },
            ],
          },
        ]}
      >
        <TorchGlow variant="core" id="core" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sideGlow,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.18, 0.48],
            }),
            transform: [
              {
                translateX: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-54, 54],
                }),
              },
            ],
          },
        ]}
      >
        <TorchGlow variant="halo" id="side" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  centerStack: {
    width: '100%',
    maxWidth: 430,
    alignItems: 'center',
    gap: 18,
  },
  listeningSurface: {
    width: '100%',
    height: 310,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    overflow: 'visible',
  },
  auraField: {
    position: 'absolute',
    bottom: -96,
    width: 520,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  dotField: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 30,
    bottom: 34,
    borderRadius: 180,
    opacity: 0.34,
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  // All disc layers are now frames for inner SVG TorchGlow gradients —
  // no backgroundColor / borderRadius / boxShadow so nothing draws a
  // hard edge against the scrim.
  outerRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 540,
    height: 320,
    marginLeft: -270,
    marginTop: -160,
  },
  gasCloudViolet: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 420,
    height: 280,
    marginLeft: -210,
    marginTop: -140,
  },
  gasCloudBlue: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 380,
    height: 260,
    marginLeft: -190,
    marginTop: -130,
  },
  innerGlow: {
    // Frame for the TorchGlow SVG. No backgroundColor / borderRadius /
    // boxShadow — the SVG radial gradient handles all the falloff so the
    // edge blends to transparent (no visible "ball").
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 320,
    height: 240,
    marginLeft: -160,
    marginTop: -120,
  },
  sideGlow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 360,
    height: 220,
    marginLeft: -180,
    marginTop: -110,
  },
  // Naked tap target — no pill, no border, no background. Label + meter
  // stack against the aura. Press just dims and scales slightly.
  listeningTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listeningText: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  listeningMeter: {
    height: 28,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  meterBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#B8A8E8',
    boxShadow: '0 0 10px rgba(184, 168, 232, 0.65)',
  },
  nonInteractive: {
    pointerEvents: 'none',
  },
  messageStack: {
    width: '100%',
    gap: 10,
  },
  messageBubble: {
    maxWidth: '88%',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 5,
    boxShadow: '0 8px 18px rgba(42,36,27,0.14)',
    elevation: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 7,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 7,
  },
  messageLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  actionCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 7,
    boxShadow: '0 8px 18px rgba(42,36,27,0.14)',
    elevation: 4,
  },
  actionTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  actionSummary: {
    fontSize: 14,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
  actionButton: {
    minHeight: 36,
    minWidth: 88,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: 'rgba(42,36,27,0.18)',
    backgroundColor: 'rgba(42,36,27,0.04)',
  },
  actionButtonText: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
