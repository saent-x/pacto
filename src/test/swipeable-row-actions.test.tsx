import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TestRenderer, { act } from 'react-test-renderer';
import { BucketedList } from '@/src/components/ui/pacto/BucketedList';
import {
  SWIPE_ACTION_SIZE,
  SWIPE_ACTION_GAP,
  SWIPE_ACTION_WIDTH,
  SWIPE_ROW_RADIUS,
  SwipeActionButton,
  SwipeActionRail,
  SwipeableRow,
} from '@/src/components/ui/pacto/SwipeableRow';

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const Reactx = require('react');
  const MockSwipeable = (props: any) =>
    Reactx.createElement(
      'MockSwipeable',
      props,
      props.renderLeftActions?.({ value: 1 }),
      props.children,
      props.renderRightActions?.({ value: 1 }),
    );
  return { __esModule: true, default: MockSwipeable };
});

describe('SwipeableRow action chrome', () => {
  it('renders swipe options as circular animated action buttons', () => {
    const onPress = vi.fn();
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <SwipeActionRail side="right">
          <SwipeActionButton
            progress={{ value: 1 }}
            side="right"
            icon="trash"
            color="#D85D4E"
            iconColor="#FFFDF7"
            accessibilityLabel="Delete item"
            testID="delete-action"
            onPress={onPress}
          />
        </SwipeActionRail>,
      );
    });

    const rail = tree!.root.findAll(
      (node) => StyleSheet.flatten(node.props?.style)?.width === SWIPE_ACTION_WIDTH,
    )[0];
    const bubble = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.width === SWIPE_ACTION_SIZE && style?.height === SWIPE_ACTION_SIZE;
    })[0];
    const button = tree!.root.findByProps({ testID: 'delete-action' });

    expect(StyleSheet.flatten(rail.props.style)).toMatchObject({
      alignItems: 'flex-end',
    });
    expect(StyleSheet.flatten(bubble.props.style)).toMatchObject({
      borderRadius: 999,
      backgroundColor: '#D85D4E',
    });

    act(() => {
      button.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);

    act(() => tree!.unmount());
  });

  it('keeps action rails outside a foreground moving row surface', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <SwipeableRow onDelete={vi.fn()}>
          <View testID="row-body" />
        </SwipeableRow>,
      );
    });

    const foreground = tree!.root.findByProps({ testID: 'swipeable-row-content' });
    const style = StyleSheet.flatten(foreground.props.style);
    const swipeable = tree!.root.findByType('MockSwipeable');

    expect(foreground.findByProps({ testID: 'row-body' })).toBeTruthy();
    expect(style).toMatchObject({
      backgroundColor: expect.any(String),
      borderRadius: SWIPE_ROW_RADIUS,
      overflow: 'hidden',
    });
    expect(StyleSheet.flatten(swipeable.props.containerStyle)).toMatchObject({
      borderRadius: SWIPE_ROW_RADIUS,
      backgroundColor: 'transparent',
    });
    expect(StyleSheet.flatten(swipeable.props.childrenContainerStyle)).toMatchObject({
      borderRadius: SWIPE_ROW_RADIUS,
      backgroundColor: 'transparent',
      overflow: 'hidden',
    });

    act(() => tree!.unmount());
  });

  it('keeps the action rail transparent so actions sit outside the row container', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <SwipeableRow onDelete={vi.fn()}>
          <View testID="row-body" />
        </SwipeableRow>,
      );
    });

    const rail = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.width === SWIPE_ACTION_WIDTH && style?.alignItems === 'flex-end';
    })[0];

    expect(StyleSheet.flatten(rail.props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });

    act(() => tree!.unmount());
  });

  it('keeps edit and delete together on the right side of the swiped row', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <SwipeableRow onEdit={vi.fn()} onDelete={vi.fn()}>
          <View testID="row-body" />
        </SwipeableRow>,
      );
    });

    expect(tree!.root.findAllByProps({ testID: 'swipe-action-edit' }).length).toBeGreaterThan(0);
    expect(tree!.root.findAllByProps({ testID: 'swipe-action-delete' }).length).toBeGreaterThan(0);
    const leftRails = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.width === SWIPE_ACTION_WIDTH && style?.alignItems === 'flex-start';
    });
    const rightRail = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return (
        style?.width === SWIPE_ACTION_WIDTH * 2 + SWIPE_ACTION_GAP &&
        style?.alignItems === 'flex-end'
      );
    })[0];

    expect(leftRails).toHaveLength(0);
    expect(rightRail).toBeDefined();

    act(() => tree!.unmount());
  });

  it('ignores duplicate delete confirmations while the first delete is pending', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let releaseDelete: (() => void) | undefined;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseDelete = resolve;
        }),
    );
    let tree: TestRenderer.ReactTestRenderer;

    try {
      await act(async () => {
        tree = TestRenderer.create(
          <SwipeableRow onDelete={onDelete}>
            <View testID="row-body" />
          </SwipeableRow>,
        );
      });

      const deleteButton = tree!.root.findByProps({ testID: 'swipe-action-delete' });
      await act(async () => {
        deleteButton.props.onPress();
      });

      const [, , buttons] = alertSpy.mock.calls[0];
      const destructive = buttons.find((button: any) => button.style === 'destructive');
      let firstPress: Promise<void> | undefined;
      let secondPress: Promise<void> | undefined;
      await act(async () => {
        firstPress = destructive.onPress();
        secondPress = destructive.onPress();
        await Promise.resolve();
      });

      expect(onDelete).toHaveBeenCalledTimes(1);
      releaseDelete?.();
      await act(async () => {
        await Promise.all([firstPress, secondPress]);
      });
    } finally {
      alertSpy.mockRestore();
      if (tree!) act(() => tree.unmount());
    }
  });

  it('does not clip bucketed swipe rows inside the list card', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <BucketedList
          buckets={[{ label: 'Active', rows: [{ id: 'one' }, { id: 'two' }] }]}
          rowKey={(row) => row.id}
          renderRow={(row) => <View testID={`row-${row.id}`} />}
        />,
      );
    });

    const bucketCard = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.borderRadius === 18 && style?.position === 'relative';
    })[0];
    const borderOverlay = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.borderRadius === 18 && style?.borderWidth === 2 && style?.zIndex === 20;
    })[0];
    const separatedRow = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.borderBottomWidth === 1;
    })[0];

    expect(StyleSheet.flatten(bucketCard.props.style)?.overflow).toBe('visible');
    expect(StyleSheet.flatten(borderOverlay.props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(StyleSheet.flatten(separatedRow.props.style)?.overflow).toBe('visible');

    act(() => tree!.unmount());
  });

  it('lets itemized bucket rows move with their own bordered swipe surface', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <BucketedList
          presentation="items"
          buckets={[{ label: 'Active', rows: [{ id: 'one' }] }]}
          rowKey={(row) => row.id}
          renderRow={(row) => (
            <SwipeableRow onDelete={vi.fn()}>
              <View testID={`row-${row.id}`} />
            </SwipeableRow>
          )}
        />,
      );
    });

    const staticBucketBorders = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.borderRadius === 18 && style?.borderWidth === 2 && style?.zIndex === 20;
    });
    const foreground = tree!.root.findByProps({ testID: 'swipeable-row-content' });
    const style = StyleSheet.flatten(foreground.props.style);
    const rightRail = tree!.root.findAll((node) => {
      const railStyle = StyleSheet.flatten(node.props?.style);
      return railStyle?.width === SWIPE_ACTION_WIDTH && railStyle?.alignItems === 'flex-end';
    })[0];

    expect(staticBucketBorders).toHaveLength(0);
    expect(style).toMatchObject({
      borderRadius: SWIPE_ROW_RADIUS,
      borderWidth: 1,
      overflow: 'hidden',
    });
    expect(StyleSheet.flatten(rightRail.props.style)?.backgroundColor).toBe('transparent');

    act(() => tree!.unmount());
  });

  it('lets multi-row swipe buckets move the visible grouped border with each row', () => {
    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <BucketedList
          presentation="items"
          swipeableRows
          buckets={[{ label: 'Earlier', rows: [{ id: 'one' }, { id: 'two' }] }]}
          rowKey={(row) => row.id}
          renderRow={(row) => (
            <SwipeableRow onDelete={vi.fn()}>
              <View testID={`row-${row.id}`} />
            </SwipeableRow>
          )}
        />,
      );
    });

    const bucketBorders = tree!.root.findAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.borderRadius === 18 && style?.borderWidth === 2 && style?.zIndex === 20;
    });
    const foregrounds = tree!.root.findAllByProps({ testID: 'swipeable-row-content' });
    const firstStyle = StyleSheet.flatten(foregrounds[0].props.style);
    const secondStyle = StyleSheet.flatten(foregrounds[1].props.style);

    expect(bucketBorders).toHaveLength(0);
    expect(firstStyle).toMatchObject({
      borderWidth: 1,
      borderTopLeftRadius: SWIPE_ROW_RADIUS,
      borderBottomLeftRadius: 0,
    });
    expect(secondStyle).toMatchObject({
      borderWidth: 1,
      borderTopWidth: 0,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: SWIPE_ROW_RADIUS,
    });

    act(() => tree!.unmount());
  });

  it('marks every bucketed swipe screen as swipe-row owned', () => {
    const root = process.cwd();
    const swipeScreens = [
      'app/(tabs)/us/checkins.tsx',
      'app/(tabs)/us/journal/index.tsx',
      'app/(tabs)/us/plans.tsx',
      'app/(tabs)/us/reminders/index.tsx',
      'app/(tabs)/us/tasks/[listId].tsx',
      'app/(tabs)/us/timetables/index.tsx',
    ];

    for (const file of swipeScreens) {
      const source = readFileSync(join(root, file), 'utf8');
      expect(source, file).toContain('<SwipeableRow');
      expect(source, file).toContain('swipeableRows');
    }
  });
});
