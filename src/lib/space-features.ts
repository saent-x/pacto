import type { FeatureId } from '@/src/lib/features/registry';
import { getDefaultFeatureIds, sanitizeFeatureIds } from '@/src/lib/features/registry';
import type { SpaceKindWire, SpaceMode } from './session';

export type CreateSpaceFeatureParams = {
  kind: SpaceKindWire;
  mode?: SpaceMode;
  enabledFeatures?: FeatureId[];
};

export function resolveCreateSpaceFeatureIds(params: CreateSpaceFeatureParams): FeatureId[] {
  const mode = params.mode ?? modeForSpaceKind(params.kind);

  return params.enabledFeatures
    ? sanitizeFeatureIds(params.enabledFeatures, mode)
    : getDefaultFeatureIds(mode);
}

export function resolveUpgradeSoloToCoupleFeatureIds(): FeatureId[] {
  return getDefaultFeatureIds('pair');
}

function modeForSpaceKind(kind: SpaceKindWire): SpaceMode {
  if (kind === 'solo') return 'solo';
  if (kind === 'crew') return 'crew';
  return 'pair';
}
