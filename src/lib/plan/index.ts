import { QUOTA_FREE_BYTES, QUOTA_PRO_BYTES } from '@/src/lib/memories/quota';
import type { Plan } from '@/src/lib/memories/quota';

// Plan is defined in quota.ts (leaf utility). Re-export to preserve both import paths.
export type { Plan };

export type PlanCapability =
  | 'mediaQuotaBytes'
  | 'videoUploads'
  | 'aiTurnsPerMonth'
  | 'voiceAssistant'
  | 'crewMaxMembers'
  | 'themes'
  | 'exportArchive';

export interface PlanLimits {
  mediaQuotaBytes: number;
  videoUploads: boolean;
  aiTurnsPerMonth: number | 'unlimited';
  voiceAssistant: boolean;
  crewMaxMembers: number | 'unlimited';
  themes: boolean;
  exportArchive: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    mediaQuotaBytes: QUOTA_FREE_BYTES,
    videoUploads: false,
    aiTurnsPerMonth: 20,
    voiceAssistant: false,
    crewMaxMembers: 4,
    themes: false,
    exportArchive: false,
  },
  pro: {
    mediaQuotaBytes: QUOTA_PRO_BYTES,
    videoUploads: true,
    aiTurnsPerMonth: 'unlimited',
    voiceAssistant: true,
    crewMaxMembers: 'unlimited',
    themes: true,
    exportArchive: true,
  },
};

export function planOf(space: { plan?: string } | null | undefined): Plan {
  return space?.plan === 'pro' ? 'pro' : 'free';
}

export function canUse(
  space: { plan?: string } | null | undefined,
  capability: PlanCapability,
): boolean {
  const limits = PLAN_LIMITS[planOf(space)];
  const value = limits[capability];
  if (typeof value === 'boolean') return value;
  if (value === 'unlimited') return true;
  return value > 0;
}
