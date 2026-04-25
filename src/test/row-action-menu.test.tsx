import React from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-menu/menu', () => {
  const Reactx = require('react');
  return {
    MenuView: (props: any) =>
      Reactx.createElement('MockMenuView', props, props.children),
  };
});

import * as Haptics from 'expo-haptics';
import { RowActionMenu } from '@/src/components/ui/RowActionMenu';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

describe('RowActionMenu', () => {
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

  it('mounts MenuView with mapped actions and shouldOpenOnLongPress', () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <RowActionMenu title="Item" subtitle="Tag" actions={baseActions}>
          <Text testID="row-body">Hello</Text>
        </RowActionMenu>,
      );
    });
    const menu = renderer.root.findAll((n: any) => n.type === 'MockMenuView')[0];
    expect(menu).toBeTruthy();
    expect(menu.props.shouldOpenOnLongPress).toBe(true);
    expect(menu.props.title).toBe('Item');
    expect(menu.props.actions).toHaveLength(2);
    expect(menu.props.actions.map((a: any) => a.id)).toEqual(['edit', 'delete']);
    expect(menu.props.actions[0].title).toBe('Edit');
    expect(menu.props.actions[1].attributes.destructive).toBe(true);
    expect(menu.props.actions[0].attributes.destructive).toBeFalsy();
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
    const menu = renderer.root.findAll((n: any) => n.type === 'MockMenuView')[0];

    await act(async () => {
      await menu.props.onPressAction({ nativeEvent: { event: 'edit' } });
    });
    expect(editPress).toHaveBeenCalledTimes(1);

    await act(async () => {
      await menu.props.onPressAction({ nativeEvent: { event: 'reorder' } });
    });
    expect(disabledPress).not.toHaveBeenCalled();

    await act(async () => {
      await menu.props.onPressAction({ nativeEvent: { event: 'delete' } });
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
    const menu = renderer.root.findAll((n: any) => n.type === 'MockMenuView')[0];

    await act(async () => {
      menu.props.onOpenMenu();
    });
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await menu.props.onPressAction({ nativeEvent: { event: 'edit' } });
    });
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');

    await act(async () => {
      await menu.props.onPressAction({ nativeEvent: { event: 'delete' } });
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');

    act(() => renderer.unmount());
  });
});
