export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export const QUOTA_FREE_BYTES = 500 * MB;
export const QUOTA_PRO_BYTES = 10 * GB;
export const MAX_IMAGE_DIM = 1080;
export const IMAGE_QUALITY = 0.8;
export const MAX_GIF_BYTES = 5 * MB;

export type Plan = 'free' | 'pro';

export function quotaCapForPlan(plan: Plan): number {
  return plan === 'pro' ? QUOTA_PRO_BYTES : QUOTA_FREE_BYTES;
}
