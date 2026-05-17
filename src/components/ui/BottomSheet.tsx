import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput as BSTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps, BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface ThemedSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onDismiss?: () => void;
  /** Called when tapping empty space in the sheet body (padding, gaps) */
  onTapBackground?: () => void;
  enableDynamicSizing?: boolean;
  scrollable?: boolean;
  /** Maximum content height in pixels when dynamic sizing. Defaults to 92% of screen height. */
  maxDynamicContentSize?: number;
}

/** Liquid glass background for the sheet */
function GlassBackground({ style }: { style?: any }) {
  const { C, mode } = useTheme();

  if (Platform.OS === 'ios') {
    // systemChromeMaterial + systemThickMaterial*  resolve to iOS 26 "liquid glass"
    // automatically on iOS 26; on older iOS they render as the familiar frosted
    // material. Either way we get the richest system-level blur available.
    const tint =
      mode === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
    return (
      <BlurView
        intensity={80}
        tint={tint as any}
        style={[
          style,
          { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
        ]}
      >
        {/* Subtle Pacto tint under the system blur. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: mode === 'dark' ? '#171B2A99' : '#FFFDF8B3',
            },
          ]}
        />
        {/* Top highlight edge — specular shimmer of the glass material. */}
        <View
          style={[
            styles.sheetHighlight,
            {
              backgroundColor: mode === 'dark' ? '#F7F1E833' : '#FFFDF8E6',
            },
          ]}
        />
      </BlurView>
    );
  }

  return (
    <View
      style={[
        style,
        {
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
      ]}
    />
  );
}

export function ThemedSheet({
  sheetRef,
  snapPoints: snapPointsProp,
  title,
  children,
  footer,
  onDismiss,
  onTapBackground,
  enableDynamicSizing: enableDynamicSizingProp,
  scrollable = false,
  maxDynamicContentSize,
}: ThemedSheetProps) {
  const { C, mode } = useTheme();

  // Dynamic sizing is the default — sheets fit their content.
  // Only use fixed snap points when explicitly provided.
  const useDynamic = enableDynamicSizingProp ?? !snapPointsProp;
  const snapPoints = useMemo(() => snapPointsProp ?? ['50%'], [snapPointsProp]);

  // Cap dynamic sheets at 92% of screen height so they don't overflow.
  const maxSize = maxDynamicContentSize ?? Dimensions.get('window').height * 0.92;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={10}>
        <View
          style={[
            styles.footer,
            {
              borderTopColor: C.lineColor,
            },
          ]}
        >
          {footer}
        </View>
      </BottomSheetFooter>
    ),
    [footer, C.lineColor],
  );

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  // When the keyboard hides, snap the sheet back to its content-fit position.
  // With enableDynamicSizing the sheet has a single snap index (0) representing
  // the measured content height. Without this, the sheet stays stuck at the
  // keyboard-expanded position after the keyboard dismisses.
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => {
      sheetRef.current?.snapToIndex(0);
    });
    return () => sub.remove();
  }, [sheetRef]);

  // Glass handle indicator color
  const handleColor = C.line2;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={useDynamic ? undefined : snapPoints}
      enableDynamicSizing={useDynamic}
      maxDynamicContentSize={useDynamic ? maxSize : undefined}
      enablePanDownToClose
      enableContentPanningGesture={scrollable}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      overDragResistanceFactor={6}
      backdropComponent={renderBackdrop}
      backgroundComponent={GlassBackground}
      handleIndicatorStyle={{
        backgroundColor: handleColor,
        width: 36,
        height: 4,
        borderRadius: 2,
      }}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={handleDismiss}
    >
      {scrollable ? (
        <>
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: C.inkColor }]}>{title}</Text>
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: C.lineColor,
                  },
                ]}
              />
            </View>
          )}
          <BottomSheetScrollView
            style={styles.bodyScroll}
            contentContainerStyle={[
              styles.bodyScrollContent,
              footer ? styles.bodyScrollContentWithFooter : undefined,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onTouchEnd={onTapBackground ? (e: any) => {
              if (e.target === e.currentTarget) onTapBackground();
            } : undefined}
          >
            <View
              style={[styles.body, footer ? styles.bodyWithFooter : undefined]}
              onTouchEnd={onTapBackground ? (e) => {
                if (e.target === e.currentTarget) onTapBackground();
              } : undefined}
            >{children}</View>
          </BottomSheetScrollView>
        </>
      ) : (
        <BottomSheetView style={styles.content}>
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: C.inkColor }]}>{title}</Text>
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: C.lineColor,
                  },
                ]}
              />
            </View>
          )}
          <View style={styles.body}>{children}</View>
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

export { BSTextInput as BottomSheetTextInput };
export { BottomSheetScrollView } from '@gorhom/bottom-sheet';

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  body: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  bodyWithFooter: {
    paddingBottom: Spacing.md,
  },
  bodyScroll: {
    flex: 1,
    minHeight: 0,
  },
  bodyScrollContent: {
    paddingBottom: Spacing.md,
  },
  bodyScrollContentWithFooter: {
    paddingBottom: 88,
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.sm,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: StyleSheet.hairlineWidth,
    borderRadius: 1,
  },
});
