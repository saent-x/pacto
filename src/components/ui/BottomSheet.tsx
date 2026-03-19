import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Keyboard, Platform } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput as BSTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';

interface ThemedSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  enableDynamicSizing?: boolean;
  scrollable?: boolean;
}

export function ThemedSheet({
  sheetRef,
  snapPoints: snapPointsProp,
  title,
  children,
  onDismiss,
  enableDynamicSizing = false,
  scrollable = false,
}: ThemedSheetProps) {
  const C = useColors();
  const snapPoints = useMemo(() => snapPointsProp ?? ['50%'], [snapPointsProp]);

  // Force sheet back to snap point when keyboard hides
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => {
      // Snap back to the first (and only) snap point
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
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss?.();
  }, [onDismiss]);

  const Wrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={enableDynamicSizing ? undefined : snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: C.surface }}
      handleIndicatorStyle={{ backgroundColor: C.dusk, width: 36 }}
      onDismiss={handleDismiss}
    >
      <Wrapper style={styles.content}>
        {title && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: C.text }]}>{title}</Text>
            <View style={[styles.divider, { backgroundColor: C.divider }]} />
          </View>
        )}
        <View style={styles.body}>{children}</View>
      </Wrapper>
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
    paddingBottom: Spacing['4xl'],
  },
});
