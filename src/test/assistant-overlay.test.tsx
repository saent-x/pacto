import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pressable } from 'react-native';

const haptics = vi.hoisted(() => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const audio = vi.hoisted(() => ({
  seekTo: vi.fn(async () => undefined),
  play: vi.fn(),
}));

const recorder = vi.hoisted(() => ({
  prepareToRecordAsync: vi.fn(async () => undefined),
  record: vi.fn(),
  stop: vi.fn(async () => undefined),
  uri: 'file:///assistant-recording.m4a',
}));

const assistantLoop = vi.hoisted(() => ({
  processAudioRecording: vi.fn(async () => undefined),
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: haptics.selectionAsync,
  impactAsync: haptics.impactAsync,
  notificationAsync: haptics.notificationAsync,
  ImpactFeedbackStyle: haptics.ImpactFeedbackStyle,
  NotificationFeedbackType: haptics.NotificationFeedbackType,
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: vi.fn(() => audio),
  useAudioRecorder: vi.fn(() => recorder),
  useAudioRecorderState: vi.fn(() => ({ isRecording: true })),
  RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } },
  requestRecordingPermissionsAsync: vi.fn(async () => ({ granted: true })),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('react-native', async (importOriginal) => {
  const Reactx = await import('react');
  const actual = await importOriginal<typeof import('react-native')>();
  return {
    ...actual,
    Modal: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) =>
      visible ? Reactx.createElement(Reactx.Fragment, null, children) : null,
  };
});

import { AssistantOverlayProvider } from '@/src/lib/assistant-overlay';
import { AiAssistantProvider } from '@/src/lib/ai';
import { HeroPactoBadge } from '@/src/components/ui/pacto/HeroPactoBadge';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function renderWithAssistant() {
  let tree: any;
  act(() => {
    tree = TestRenderer.create(
      <AiAssistantProvider>
        <AssistantOverlayProvider processAudioRecording={assistantLoop.processAudioRecording}>
          <HeroPactoBadge />
        </AssistantOverlayProvider>
      </AiAssistantProvider>,
    );
  });
  return tree;
}

function findByTestID(root: any, testID: string) {
  return root.findAll((node: any) => node.props?.testID === testID);
}

function findHostByTestID(root: any, testID: string) {
  return root.findAll((node: any) => node.type === Pressable && node.props?.testID === testID)[0];
}

describe('assistant overlay', () => {
  beforeEach(() => {
    haptics.impactAsync.mockClear();
    audio.seekTo.mockClear();
    audio.seekTo.mockImplementation(async () => undefined);
    audio.play.mockClear();
    recorder.prepareToRecordAsync.mockClear();
    recorder.record.mockClear();
    recorder.stop.mockClear();
    assistantLoop.processAudioRecording.mockClear();
  });

  it('opens the voice overlay from the hero pacto badge with tactile impact haptics', async () => {
    const tree = renderWithAssistant();

    expect(findByTestID(tree.root, 'pacto-ai-voice-overlay')).toHaveLength(0);

    const trigger = findHostByTestID(tree.root, 'pacto-ai-trigger');
    await act(async () => {
      await trigger.props.onPress({});
    });

    expect(haptics.impactAsync).toHaveBeenCalledWith(haptics.ImpactFeedbackStyle.Medium);
    expect(audio.seekTo).toHaveBeenCalledWith(0);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(findByTestID(tree.root, 'pacto-ai-voice-overlay')).toHaveLength(1);
    expect(findByTestID(tree.root, 'pacto-ai-voice-wave')).toHaveLength(1);
    expect(findByTestID(tree.root, 'pacto-ai-voice-pill')).toHaveLength(1);
    expect(findByTestID(tree.root, 'pacto-ai-message')).toHaveLength(0);
    expect(recorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    expect(recorder.record).toHaveBeenCalledTimes(1);

    const pressedStyle = trigger.props.style({ pressed: true });
    const styleList = Array.isArray(pressedStyle) ? pressedStyle : [pressedStyle];
    const transformStyle = styleList.find((style: any) => Array.isArray(style?.transform));
    expect(transformStyle?.transform).toEqual([{ scale: 0.82 }]);
  });

  it('still opens the overlay if the tap sound cannot play', async () => {
    audio.seekTo.mockImplementationOnce(() => {
      throw new Error('audio unavailable');
    });
    const tree = renderWithAssistant();

    const trigger = findHostByTestID(tree.root, 'pacto-ai-trigger');
    await act(async () => {
      await trigger.props.onPress({});
    });

    expect(findByTestID(tree.root, 'pacto-ai-voice-overlay')).toHaveLength(1);
  });

  it('dismisses the overlay when the shaded backdrop is pressed', async () => {
    const tree = renderWithAssistant();

    const trigger = findHostByTestID(tree.root, 'pacto-ai-trigger');
    await act(async () => {
      await trigger.props.onPress({});
    });

    const dismiss = findByTestID(tree.root, 'pacto-ai-overlay-dismiss')[0];
    await act(async () => {
      dismiss.props.onPress();
    });

    expect(findByTestID(tree.root, 'pacto-ai-voice-overlay')).toHaveLength(0);
  });

  it('submits the local recording to the assistant loop', async () => {
    const tree = renderWithAssistant();

    const trigger = findHostByTestID(tree.root, 'pacto-ai-trigger');
    await act(async () => {
      await trigger.props.onPress({});
    });

    const submit = findHostByTestID(tree.root, 'pacto-ai-submit-recording');
    await act(async () => {
      await submit.props.onPress();
    });

    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(assistantLoop.processAudioRecording).toHaveBeenCalledWith('file:///assistant-recording.m4a');
  });
});
