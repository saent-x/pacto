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
import { useAiAssistant } from './ai';
import { useTheme } from './theme';

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
  const { F } = useTheme();
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
            backgroundColor: 'rgba(10, 8, 7, 0.72)',
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
              style={({ pressed }) => [
                styles.listeningPill,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  borderColor: recorderState.isRecording ? 'rgba(236, 102, 255, 0.72)' : 'rgba(255,255,255,0.2)',
                },
              ]}
            >
              <Text style={[styles.listeningText, { color: '#FFF8FF', fontFamily: F.geistMonoMedium }]}>
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
                      backgroundColor: isUser ? 'rgba(45, 88, 78, 0.82)' : 'rgba(48, 41, 35, 0.9)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageLabel,
                      {
                        color: isUser ? '#BEEBDD' : '#F1D3C3',
                        fontFamily: F.geistMonoMedium,
                      },
                    ]}
                  >
                    {isUser ? 'You' : message.from === 'system' ? 'System' : 'Pacto AI'}
                  </Text>
                  <Text style={[styles.messageBody, { color: '#FFF8ED', fontFamily: F.geistMedium }]}>
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
                    borderColor: action.destructive ? 'rgba(255,143,112,0.58)' : 'rgba(255,255,255,0.32)',
                    backgroundColor: 'rgba(250,248,242,0.13)',
                  },
                ]}
              >
                <Text style={[styles.messageLabel, { color: '#F1D3C3', fontFamily: F.geistMonoMedium }]}>
                  preview
                </Text>
                <Text style={[styles.actionTitle, { color: '#FFF8ED', fontFamily: F.geistMedium }]}>
                  {action.title}
                </Text>
                <Text style={[styles.actionSummary, { color: 'rgba(255,248,237,0.84)', fontFamily: F.geistMedium }]}>
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
                    <Text style={[styles.actionButtonText, { color: '#FFF8ED', fontFamily: F.geistMonoMedium }]}>
                      cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="pacto-ai-confirm-action"
                    accessibilityRole="button"
                    accessibilityLabel="Confirm Pacto AI action"
                    onPress={onConfirm}
                    style={[styles.actionButton, { backgroundColor: '#7FBFAF' }]}
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
        style={[
          styles.outerRing,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.46],
            }),
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
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
      />
      <Animated.View
        style={[
          styles.gasCloudViolet,
          {
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.16, 0.4],
            }),
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['28deg', '388deg'],
                }),
              },
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
      />
      <Animated.View
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
      />
      <Animated.View
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
      />
      <Animated.View
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
      />
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
    height: 330,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
    overflow: 'visible',
  },
  auraField: {
    position: 'absolute',
    bottom: -76,
    width: 440,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  dotField: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 24,
    bottom: 24,
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D7BBFF',
  },
  outerRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 380,
    height: 180,
    marginLeft: -190,
    marginTop: -90,
    borderRadius: 120,
    backgroundColor: 'rgba(218, 62, 255, 0.11)',
    boxShadow: '0 0 96px 64px rgba(213, 52, 255, 0.26)',
  },
  gasCloudViolet: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 310,
    height: 150,
    marginLeft: -155,
    marginTop: -75,
    borderRadius: 110,
    backgroundColor: 'rgba(147, 76, 255, 0.12)',
    boxShadow: '0 0 86px 54px rgba(154, 83, 255, 0.24)',
  },
  gasCloudBlue: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 250,
    height: 150,
    marginLeft: -125,
    marginTop: -75,
    borderRadius: 100,
    backgroundColor: 'rgba(73, 174, 255, 0.09)',
    boxShadow: '0 0 82px 48px rgba(79, 190, 255, 0.18)',
  },
  innerGlow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 138,
    height: 112,
    marginLeft: -69,
    marginTop: -56,
    borderRadius: 70,
    backgroundColor: 'rgba(238, 96, 255, 0.18)',
    boxShadow: '0 0 72px 36px rgba(241, 78, 255, 0.36)',
  },
  sideGlow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 180,
    height: 98,
    marginLeft: -90,
    marginTop: -49,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 79, 210, 0.1)',
    boxShadow: '0 0 78px 40px rgba(226, 66, 255, 0.24)',
  },
  listeningPill: {
    minWidth: 164,
    minHeight: 64,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 11,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 26, 38, 0.46)',
    boxShadow: '0 14px 36px rgba(0,0,0,0.34)',
    elevation: 18,
  },
  listeningText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  listeningMeter: {
    height: 18,
    minWidth: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  meterBar: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#F4B8FF',
    boxShadow: '0 0 10px rgba(241, 78, 255, 0.72)',
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
    boxShadow: '0 10px 18px rgba(0,0,0,0.22)',
    elevation: 8,
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
    boxShadow: '0 10px 18px rgba(0,0,0,0.22)',
    elevation: 8,
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
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionButtonText: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
