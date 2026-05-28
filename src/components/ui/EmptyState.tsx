import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionEmptyState } from '@/src/components/ui/pacto/ActionEmptyState';
import type { IconName } from '@/src/components/ui/Icon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  /** @deprecated — use FAB instead. Kept for API compat but no longer rendered. */
  actionLabel?: string;
  /** @deprecated */
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <ActionEmptyState
        icon={(icon as IconName) || 'sparkle'}
        title={title}
        body={description}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
});
