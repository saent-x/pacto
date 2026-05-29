import { describe, expect, it } from 'vitest';

import {
  buildMediaQuotaReconciliation,
  buildMediaQuotaReconciliationTransactions,
} from '../../scripts/reconcile-media-quota.mjs';

describe('media quota reconciliation', () => {
  it('plans missing and stale quota rows from actual attachment bytes per space', () => {
    const plan = buildMediaQuotaReconciliation(
      [
        {
          id: 'solo-space',
          memories: [
            { attachments: [{ mediaSize: 1024 }, { mediaSize: 2048 }] },
            { attachments: [{ mediaSize: null }, { mediaSize: -1 }] },
          ],
          mediaQuota: [],
        },
        {
          id: 'shared-space',
          memories: [{ attachments: [{ mediaSize: 512 }] }],
          mediaQuota: [{ id: 'quota-1', bytesUsed: 1 }],
        },
        {
          id: 'clean-space',
          memories: [],
          mediaQuota: [{ id: 'quota-2', bytesUsed: 0 }],
        },
      ],
      { idFactory: () => 'new-quota-id' },
    );

    expect(plan.summary).toEqual({
      spaces: 3,
      creates: 1,
      updates: 1,
      deletes: 0,
      unchanged: 1,
    });
    expect(plan.actions).toEqual([
      {
        type: 'create',
        spaceId: 'solo-space',
        quotaId: 'new-quota-id',
        bytesUsed: 3072,
      },
      {
        type: 'update',
        spaceId: 'shared-space',
        quotaId: 'quota-1',
        previousBytesUsed: 1,
        bytesUsed: 512,
      },
    ]);
  });

  it('keeps one quota row per space and deletes duplicate quota rows', () => {
    const plan = buildMediaQuotaReconciliation([
      {
        id: 'space-with-duplicates',
        memories: [{ attachments: [{ mediaSize: 7 }] }],
        mediaQuota: [
          { id: 'quota-a', bytesUsed: 0 },
          { id: 'quota-b', bytesUsed: 99 },
        ],
      },
    ]);

    expect(plan.actions).toEqual([
      {
        type: 'update',
        spaceId: 'space-with-duplicates',
        quotaId: 'quota-a',
        previousBytesUsed: 0,
        bytesUsed: 7,
      },
      {
        type: 'delete',
        spaceId: 'space-with-duplicates',
        quotaId: 'quota-b',
      },
    ]);
  });

  it('builds admin transactions for planned quota repairs', () => {
    const calls: unknown[] = [];
    const db = {
      tx: {
        mediaQuotaUsage: new Proxy(
          {},
          {
        get: (_target, quotaId: string) => ({
          update: (payload: unknown) => {
            calls.push({ quotaId, payload });
            return {
              link: (links: unknown) => ({ quotaId, payload, links }),
            };
          },
          delete: () => {
            calls.push({ quotaId, delete: true });
            return { quotaId, delete: true };
          },
        }),
      },
    ),
      },
    };

    const txns = buildMediaQuotaReconciliationTransactions(db, [
      {
        type: 'create',
        spaceId: 'solo-space',
        quotaId: 'quota-new',
        bytesUsed: 10,
      },
      {
        type: 'update',
        spaceId: 'shared-space',
        quotaId: 'quota-existing',
        previousBytesUsed: 0,
        bytesUsed: 20,
      },
      {
        type: 'delete',
        spaceId: 'shared-space',
        quotaId: 'quota-duplicate',
      },
    ], 1234);

    expect(calls).toEqual([
      { quotaId: 'quota-new', payload: { bytesUsed: 10, updatedAt: 1234 } },
      { quotaId: 'quota-existing', payload: { bytesUsed: 20, updatedAt: 1234 } },
      { quotaId: 'quota-duplicate', delete: true },
    ]);
    expect(txns).toEqual([
      {
        quotaId: 'quota-new',
        payload: { bytesUsed: 10, updatedAt: 1234 },
        links: { space: 'solo-space' },
      },
      {
        quotaId: 'quota-existing',
        payload: { bytesUsed: 20, updatedAt: 1234 },
        links: { space: 'shared-space' },
      },
      {
        quotaId: 'quota-duplicate',
        delete: true,
      },
    ]);
  });
});
