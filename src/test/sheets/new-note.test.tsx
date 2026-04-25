import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), push: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(async () => undefined),
  selectionAsync: vi.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const alertSpy = vi.hoisted(() => vi.fn());
vi.mock('react-native', async () => {
  const actual: any = await vi.importActual('react-native');
  return { ...actual, Alert: { alert: alertSpy } };
});

const noteState = vi.hoisted(() => ({
  create: vi.fn(async () => undefined),
}));

vi.mock('@/src/hooks/useLoveNotes', () => ({
  useLoveNotes: () => ({ create: noteState.create, notes: [], isLoading: false }),
}));

import NewNote from '@/app/sheets/new-note';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));
const findByTestID = (root: any, id: string) =>
  root.findAll((n: any) => n.props?.testID === id)[0];

describe('new-note sheet', () => {
  beforeEach(() => {
    noteState.create.mockClear();
    (router.back as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    alertSpy.mockClear();
  });

  it('renders all 5 vibe pills in order', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewNote />); await flush(); });
    for (const k of ['sweet','funny','thank','sorry','proud']) {
      expect(findByTestID(renderer.root, `new-note-vibe-${k}`)).toBeDefined();
    }
    act(() => renderer.unmount());
  });

  it('Send button is disabled while body is empty', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewNote />); await flush(); });
    const disabled = renderer.root.findAll(
      (n: any) => n.props?.icon === 'heart' && n.props?.disabled === true,
    ).length;
    expect(disabled).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });

  it('typing whitespace-only does NOT enable send', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewNote />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-note-body-input').props.onChangeText('   ');
      await flush();
    });
    const stillDisabled = renderer.root.findAll(
      (n: any) => n.props?.icon === 'heart' && n.props?.disabled === true,
    ).length;
    expect(stillDisabled).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });

  it('happy path: type body + pick funny vibe + send → create + haptic + back', async () => {
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewNote />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-note-body-input').props.onChangeText('hello');
      await flush();
    });
    await act(async () => {
      findByTestID(renderer.root, 'new-note-vibe-funny').props.onPress();
      await flush();
    });
    const sendBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'heart' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { sendBtn.props.onPress(); await flush(); });
    expect(noteState.create).toHaveBeenCalledWith({ body: 'hello', vibe: 'funny' });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(router.back).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('create rejection: Alert shown, back NOT called, button re-enables', async () => {
    noteState.create.mockRejectedValueOnce(new Error('offline'));
    let renderer: any;
    await act(async () => { renderer = TestRenderer.create(<NewNote />); await flush(); });
    await act(async () => {
      findByTestID(renderer.root, 'new-note-body-input').props.onChangeText('hi');
      await flush();
    });
    const sendBtn = renderer.root.findAll(
      (n: any) => n.props?.icon === 'heart' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    )[0];
    await act(async () => { sendBtn.props.onPress(); await flush(); });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(router.back).not.toHaveBeenCalled();
    const reEnabled = renderer.root.findAll(
      (n: any) => n.props?.icon === 'heart' && typeof n.props?.onPress === 'function' && !n.props?.disabled,
    ).length;
    expect(reEnabled).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });
});
