import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => {
  function makeTxRow(table: string, rowId: string) {
    return {
      update(payload: any) {
        return {
          table,
          id: rowId,
          op: 'update',
          payload,
          link(links: any) {
            return { table, id: rowId, op: 'update', payload, links };
          },
        };
      },
      delete() {
        return { table, id: rowId, op: 'delete' };
      },
    };
  }

  return {
    useQuery: vi.fn(() => ({ data: {}, isLoading: false, error: null })),
    transact: vi.fn(async (_op: any) => undefined),
    tx: new Proxy(
      {},
      {
        get: (_target, table: string) =>
          new Proxy(
            {},
            {
              get: (_rows, rowId: string) => makeTxRow(table, rowId),
            },
          ),
      },
    ),
  };
});

const idMock = vi.hoisted(() => vi.fn(() => 'generated-reminder-id'));

vi.mock('@/src/lib/instant', () => ({
  db: dbMock,
  id: idMock,
}));

import { AiAssistantProvider, useAiAssistant } from '@/src/lib/ai/provider';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Assistant = ReturnType<typeof useAiAssistant>;

async function renderAssistant() {
  let latest: Assistant | null = null;

  function Probe() {
    latest = useAiAssistant();
    return null;
  }

  await act(async () => {
    TestRenderer.create(
      <AiAssistantProvider
        allowedDomains={['reminders']}
        mutationContext={{
          coupleId: 'shared-space',
          personalSpaceId: 'solo-space',
          sharedSpaceId: 'shared-space',
          userId: 'user-1',
        }}
      >
        <Probe />
      </AiAssistantProvider>,
    );
    await flush();
  });

  return {
    get assistant() {
      if (!latest) throw new Error('assistant context was not rendered');
      return latest;
    },
  };
}

describe('AiAssistantProvider', () => {
  beforeEach(() => {
    dbMock.transact.mockReset();
    dbMock.transact.mockImplementation(async (_op: any) => undefined);
    idMock.mockClear();
  });

  it('ignores duplicate confirmations while assistant actions are applying', async () => {
    const pendingTransactions: Array<() => void> = [];
    dbMock.transact.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingTransactions.push(resolve);
        }),
    );
    const harness = await renderAssistant();

    await act(async () => {
      harness.assistant.queueActionDrafts([
        {
          id: 'reminder-create',
          domain: 'reminders',
          operation: 'create',
          input: {
            title: 'Call mum',
            dueAt: 1777572000000,
          },
        },
      ]);
      await flush();
    });

    expect(harness.assistant.turn.pendingActions).toHaveLength(1);

    await act(async () => {
      harness.assistant.confirmPendingActions();
      harness.assistant.confirmPendingActions();
      await flush();
    });

    expect(dbMock.transact).toHaveBeenCalledTimes(1);

    pendingTransactions.forEach((resolve) => resolve());
    await act(async () => {
      await flush();
    });
  });
});
