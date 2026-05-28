import { describe, expect, it } from 'vitest';
import { calculateMediaQuotaSnapshot, canAddMediaBytes } from '@/src/hooks/memories/useMediaQuota';
import { QUOTA_FREE_BYTES } from '@/src/lib/memories/quota';

describe('calculateMediaQuotaSnapshot', () => {
  it('uses scoped memory attachment bytes instead of stale materialized quota bytes', () => {
    const result = calculateMediaQuotaSnapshot({
      plan: 'free',
      mediaQuota: { bytesUsed: 1 },
      memories: [
        {
          attachments: [
            { mediaSize: 1024 },
            { mediaSize: 2048 },
            { mediaSize: null },
          ],
        },
        {
          attachments: [{ mediaSize: 512 }],
        },
      ],
    });

    expect(result.bytesUsed).toBe(3584);
    expect(result.cap).toBe(QUOTA_FREE_BYTES);
  });

  it('falls back to the materialized quota row when attachment rows were not loaded', () => {
    expect(
      calculateMediaQuotaSnapshot({
        plan: 'free',
        mediaQuota: { bytesUsed: 4096 },
      }).bytesUsed,
    ).toBe(4096);
  });

  it('does not undercount shared usage when private attachment rows are hidden from the client query', () => {
    expect(
      calculateMediaQuotaSnapshot({
        plan: 'free',
        mediaQuota: { bytesUsed: 4096 },
        memories: [
          {
            attachments: [{ mediaSize: 1024 }],
          },
        ],
      }).bytesUsed,
    ).toBe(4096);
  });

  it('uses the highest materialized quota row when duplicate rows exist', () => {
    expect(
      calculateMediaQuotaSnapshot({
        plan: 'free',
        mediaQuota: [{ bytesUsed: 1 }, { bytesUsed: 4096 }],
        memories: [],
      }).bytesUsed,
    ).toBe(4096);
  });

  it('rejects additions that would push the space over its quota cap', () => {
    expect(canAddMediaBytes({ bytesUsed: 90, cap: 100 }, 10)).toBe(true);
    expect(canAddMediaBytes({ bytesUsed: 90, cap: 100 }, 11)).toBe(false);
  });
});
