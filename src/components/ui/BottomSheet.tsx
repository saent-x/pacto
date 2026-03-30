import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Keyboard, Platform } from 'react-native';
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
import { useColors } from '@/src/hooks/useColors';
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
}

/** Liquid glass background for the sheet */
function GlassBackground({ style }: { style?: any }) {
  const { mode } = useTheme();
  const C = useColors();

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={40}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[style, { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: mode === 'dark'
                ? 'rgba(22, 19, 17, 0.6)'
                : 'rgba(242, 237, 231, 0.55)',
            },
          ]}
        />
        {/* Glass highlight edge */}
        <View
          style={[
            styles.sheetHighlight,
            {
              backgroundColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(255, 255, 255, 0.4)',
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
          backgroundColor: mode === 'dark'
            ? 'rgba(27, 23, 21, 0.95)'
            : 'rgba(242, 237, 231, 0.97)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
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
  enableDynamicSizing = false,
  scrollable = false,
}: ThemedSheetProps) {
  const C = useColors();
  const { mode } = useTheme();
  const snapPoints = useMemo(() => snapPointsProp ?? ['50%'], [snapPointsProp]);

  // Force sheet back to snap point when keyboard hides
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => {
      sheetRef.current?.snapToIndex(0);
    });
    return () => sub.remove();
  }, [sheetRef]);

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
              borderTopColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          {footer}
        </View>
      </BottomSheetFooter>
    ),
    [footer, mode],
  );

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss?.();
  }, [onDismiss]);

  // Glass handle indicator color
  const handleColor = mode === 'dark'
    ? 'rgba(255, 255, 255, 0.15)'
    : 'rgba(0, 0, 0, 0.12)';

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={enableDynamicSizing ? undefined : snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose
      enableContentPanningGesture={scrollable}
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
              <Text style={[styles.title, { color: C.text }]}>{title}</Text>
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
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
              <Text style={[styles.title, { color: C.text }]}>{title}</Text>
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
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
