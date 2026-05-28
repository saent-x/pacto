import { StyleProp, ViewStyle } from 'react-native';
import { ActionEmptyState } from '@/src/components/ui/pacto/ActionEmptyState';
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
      body="This feature is not available for this pact type."
      style={style}
    />
  );
}
