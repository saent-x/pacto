import type { FeatureId } from '@/src/lib/features/registry';
import { getDefaultFeatureIds } from '@/src/lib/features/registry';
import type { SpaceKindWire, SpaceMode } from './session';

export type CreateSpaceFeatureParams = {
  kind: SpaceKindWire;
  mode?: SpaceMode;
  enabledFeatures?: FeatureId[];
};

export function resolveCreateSpaceFeatureIds(params: CreateSpaceFeatureParams): FeatureId[] {
  const mode = resolveCreateSpaceKind(params);
  return getDefaultFeatureIds(mode);
}

export function resolveCreateSpaceKind(
  params: Pick<CreateSpaceFeatureParams, 'kind' | 'mode'>,
): SpaceMode {
  return params.mode ?? modeForSpaceKind(params.kind);
}

export function isCreateSpaceInviteEligible(
  params: Pick<CreateSpaceFeatureParams, 'kind' | 'mode'>,
): boolean {
  return resolveCreateSpaceKind(params) !== 'solo';
}

export function resolveUpgradeSoloToCoupleFeatureIds(): FeatureId[] {
  return getDefaultFeatureIds('pair');
}

function modeForSpaceKind(kind: SpaceKindWire): SpaceMode {
  if (kind === 'solo') return 'solo';
  if (kind === 'crew') return 'crew';
  return 'pair';
}
