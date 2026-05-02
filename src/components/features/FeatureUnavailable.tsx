import { router } from 'expo-router';
import { StyleProp, ViewStyle } from 'react-native';
import { ActionEmptyState } from '@/src/components/ui/pacto';
import type { FeatureEntry } from '@/src/lib/features/registry';

type Props = {
  feature: FeatureEntry;
  style?: StyleProp<ViewStyle>;
};

export function FeatureUnavailable({ feature, style }: Props) {
  return (
    <ActionEmptyState
      icon={feature.icon}
      title={`${feature.label} is unavailable`}
      body="Turn this feature on from Profile to use it in this space."
      actionLabel="Open Profile"
      onAction={() => router.push('/sheets/profile')}
      style={style}
    />
  );
}
