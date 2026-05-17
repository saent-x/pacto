import React from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as Haptics from 'expo-haptics';
import { RowActionMenu } from '@/src/components/ui/RowActionMenu';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('RowActionMenu', () => {
  let alertButtons: any[] = [];

  const baseActions = [
    { key: 'edit', label: 'Edit', icon: 'edit' as const, onPress: vi.fn() },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'trash' as const,
      destructive: true,
      onPress: vi.fn(),
    },
  ];

  beforeEach(() => {
    alertButtons = [];
    vi.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons ?? [];
    });
  });

  it('renders a long-press action sheet trigger with children', () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <RowActionMenu title="Item" subtitle="Tag" actions={baseActions}>
          <Text testID="row-body">Hello</Text>
        </RowActionMenu>,
      );
    });
    const trigger = renderer.root.findByType(Pressable);
    expect(trigger.props.delayLongPress).toBe(350);
    const body = renderer.root.findAll((n: any) => n.props?.testID === 'row-body')[0];
    expect(body).toBeTruthy();
    act(() => renderer.unmount());
  });

  it('invokes the matching action onPress and skips disabled', async () => {
    const editPress = vi.fn();
    const disabledPress = vi.fn();
    const deletePress = vi.fn();
    const actions = [
      { key: 'edit', label: 'Edit', icon: 'edit' as const, onPress: editPress },
      {
        key: 'reorder',
        label: 'Reorder',
        icon: 'chevronsUp' as const,
        disabled: true,
        onPress: disabledPress,
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: 'trash' as const,
        destructive: true,
        onPress: deletePress,
      },
    ];
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <RowActionMenu actions={actions}>
          <Text>Body</Text>
        </RowActionMenu>,
      );
    });
    const trigger = renderer.root.findByType(Pressable);

    await act(async () => {
      trigger.props.onLongPress();
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      '',
      undefined,
      [
        expect.objectContaining({ text: 'Edit', style: 'default' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      ],
      { cancelable: true },
    );

    await act(async () => {
      await alertButtons[0].onPress();
    });
    expect(editPress).toHaveBeenCalledTimes(1);

    await act(async () => {
      alertButtons[2].onPress?.();
    });
    expect(disabledPress).not.toHaveBeenCalled();

    await act(async () => {
      await alertButtons[1].onPress();
    });
    expect(deletePress).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it('fires Selection haptic on open and Warning on destructive tap', async () => {
    (Haptics.selectionAsync as any).mockClear();
    (Haptics.notificationAsync as any).mockClear();
    (Haptics.impactAsync as any).mockClear();

    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <RowActionMenu actions={baseActions}>
          <Text>Body</Text>
        </RowActionMenu>,
      );
    });
    const trigger = renderer.root.findByType(Pressable);

    await act(async () => {
      trigger.props.onLongPress();
    });
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await alertButtons[0].onPress();
    });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    await act(async () => {
      await alertButtons[1].onPress();
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Warning,
    );

    act(() => renderer.unmount());
  });
});
