import type { ReactNode } from 'react';
import type { FeatureId } from '@/src/lib/features/registry';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { FeatureUnavailable } from './FeatureUnavailable';

type Props = {
  featureId: FeatureId;
  children: ReactNode;
};

export function FeatureRouteGuard({ featureId, children }: Props) {
  const gate = useFeatureGate(featureId);

  if (!gate.enabled) {
    return gate.feature ? <FeatureUnavailable feature={gate.feature} /> : null;
  }

  return <>{children}</>;
}
