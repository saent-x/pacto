import { vi, describe, expect, it } from 'vitest';

// useMemoryComposer imports db/useSession at module scope; mock them so the
// pure validateComposerDraft function can be imported without env variables.
vi.mock('@/src/lib/instant', () => ({
  db: { useQuery: vi.fn(() => ({ isLoading: false, error: null, data: {} })), transact: vi.fn() },
  id: () => 'mock-id',
}));
vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({ user: null, activeCouple: null, space: null }),
}));

import { validateComposerDraft } from '@/src/hooks/memories/useMemoryComposer';

const baseSpace = { id: 's1', kind: 'pair' as const, plan: 'free' as const };

describe('validateComposerDraft', () => {
  it('rejects empty body with no attachments', () => {
    const r = validateComposerDraft({ body: '   ', attachments: [], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(false);
  });
  it('accepts body-only', () => {
    const r = validateComposerDraft({ body: 'hi', attachments: [], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(true);
  });
  it('accepts media-only', () => {
    const r = validateComposerDraft({ body: '', attachments: [{ type: 'image' }], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(true);
  });
  it('rejects poll on free plan in pair space (poll allowed only in crew)', () => {
    const r = validateComposerDraft({ body: 'q', attachments: [], pollOptions: ['a','b'], mode: 'post' }, { ...baseSpace, kind: 'pair' });
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/poll/i);
  });
  it('accepts poll in crew', () => {
    const r = validateComposerDraft({ body: 'q', attachments: [], pollOptions: ['a','b'], mode: 'post' }, { ...baseSpace, kind: 'crew' });
    expect(r.ok).toBe(true);
  });
  it('rejects video attachment on free plan', () => {
    const r = validateComposerDraft({ body: '', attachments: [{ type: 'video' }], pollOptions: [], mode: 'post' }, baseSpace);
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/video/i);
  });
});
