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
            backgroundColor: 'rgba(10, 8, 7, 0.72)',
            paddingBottom: Math.max(insets.bottom + 48, height * 0.12),
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

        <View style={styles.bottomStack}>
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

          <View
            testID="pacto-ai-voice-pill"
            style={[
              styles.voicePanel,
              styles.nonInteractive,
              {
                borderColor: 'rgba(255,255,255,0.18)',
                backgroundColor: 'rgba(250,248,242,0.12)',
              },
            ]}
          >
            <Text style={[styles.label, { color: '#FFF8ED', fontFamily: F.geistMonoMedium }]}>
              {labelForState(turn.state)}
            </Text>
            <VoiceWave color={C.accent2} />
          </View>

          <Pressable
            testID="pacto-ai-submit-recording"
            accessibilityRole="button"
            accessibilityLabel="Submit Pacto AI recording"
            onPress={submitRecording}
            style={[
              styles.submitButton,
              {
                backgroundColor: recorderState.isRecording ? '#7FBFAF' : 'rgba(255,255,255,0.16)',
              },
            ]}
          >
            <Text style={[styles.submitButtonText, { color: '#10201D', fontFamily: F.geistMonoMedium }]}>
              submit
            </Text>
          </Pressable>
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

function VoiceWave({ color }: { color: string }) {
  const values = useRef(
    Array.from({ length: 7 }, (_, index) => new Animated.Value(index % 2 ? 0.35 : 0.72)),
  ).current;

  useEffect(() => {
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: index % 2 ? 1 : 0.45,
            duration: 360 + index * 42,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: index % 2 ? 0.35 : 0.72,
            duration: 420 + index * 36,
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
  }, [values]);

  return (
    <View testID="pacto-ai-voice-wave" style={styles.wave}>
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              opacity: value.interpolate({
                inputRange: [0.35, 1],
                outputRange: [0.52, 1],
              }),
              transform: [
                {
                  scaleY: value.interpolate({
                    inputRange: [0.35, 1],
                    outputRange: [0.55, 1.8],
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  bottomStack: {
    width: '100%',
    maxWidth: 390,
    gap: 14,
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
  submitButton: {
    alignSelf: 'center',
    minHeight: 42,
    minWidth: 120,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  submitButtonText: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  voicePanel: {
    alignSelf: 'center',
    minHeight: 58,
    minWidth: 210,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  nonInteractive: {
    pointerEvents: 'none',
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.7,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  wave: {
    height: 30,
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waveBar: {
    width: 6,
    height: 16,
    borderRadius: 3,
  },
});
