import { useMemo } from 'react';
import { db } from '@/src/lib/instant';
import { safeInstantId } from '@/src/lib/instant-id';
import { planOf } from '@/src/lib/plan';
import { quotaCapForPlan } from '@/src/lib/memories/quota';

export function calculateMediaQuotaSnapshot(space: any) {
  const cap = quotaCapForPlan(planOf(space ?? null));
  const bytesUsed = quotaBytesUsed(space);
  const percent = cap === 0 ? 0 : Math.min(100, Math.round((bytesUsed / cap) * 100));
  return {
    bytesUsed,
    cap,
    percent,
    isOverThreshold: percent >= 80,
    isAtCap: bytesUsed >= cap,
  };
}

export function canAddMediaBytes(
  quota: { bytesUsed: number; cap: number },
  nextBytes: number,
): boolean {
  return quota.bytesUsed + numberOrZero(nextBytes) <= quota.cap;
}

export function useMediaQuota(spaceId: string | null | undefined) {
  const safeSpaceId = safeInstantId(spaceId);
  const { data } = db.useQuery(
    safeSpaceId
      ? {
          spaces: {
            $: { where: { id: safeSpaceId } },
            mediaQuota: {},
            memories: {
              attachments: {},
            },
          },
        }
      : null,
  );

  return useMemo(() => {
    const space = data?.spaces?.[0];
    return calculateMediaQuotaSnapshot(space);
  }, [data]);
}

function quotaBytesUsed(space: any): number {
  if (!space) return 0;
  const materializedBytes = materializedQuotaBytesUsed(space.mediaQuota);
  if (Array.isArray(space.memories)) {
    return Math.max(materializedBytes, attachmentBytesUsed(space.memories));
  }
  return materializedBytes;
}

function materializedQuotaBytesUsed(mediaQuota: any): number {
  const rows = Array.isArray(mediaQuota) ? mediaQuota : mediaQuota ? [mediaQuota] : [];
  return rows.reduce((max, quota) => Math.max(max, numberOrZero(quota?.bytesUsed)), 0);
}

function attachmentBytesUsed(memories: any[]): number {
  let total = 0;
  for (const memory of memories) {
    if (!Array.isArray(memory?.attachments)) continue;
    for (const attachment of memory.attachments) {
      total += numberOrZero(attachment?.mediaSize);
    }
  }
  return total;
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}
