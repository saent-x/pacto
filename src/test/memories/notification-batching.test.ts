import { describe, expect, it, vi } from 'vitest';
import { ReactionDebouncer } from '@/src/lib/memories/notifications';

describe('ReactionDebouncer', () => {
  it('emits the first reaction immediately', async () => {
    const send = vi.fn();
    const d = new ReactionDebouncer({ windowMs: 1000, send });
    d.notify('memory-1', 'recipient-1', { actor: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('batches subsequent reactions within the window', async () => {
    const send = vi.fn();
    const d = new ReactionDebouncer({ windowMs: 100, send });
    d.notify('memory-1', 'recipient-1', { actor: 'A' });
    d.notify('memory-1', 'recipient-1', { actor: 'B' });
    d.notify('memory-1', 'recipient-1', { actor: 'C' });
    await new Promise((r) => setTimeout(r, 150));
    expect(send).toHaveBeenCalledTimes(2);
    const lastCall = send.mock.calls[1][0];
    expect(lastCall.aggregate.others).toBe(2);
  });

  it('does not batch reactions to different memories', async () => {
    const send = vi.fn();
    const d = new ReactionDebouncer({ windowMs: 100, send });
    d.notify('memory-1', 'r1', { actor: 'A' });
    d.notify('memory-2', 'r1', { actor: 'B' });
    await new Promise((r) => setTimeout(r, 150));
    expect(send).toHaveBeenCalledTimes(2);
  });
});
