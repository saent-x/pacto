import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bucketOf, orderBuckets } from '@/src/components/tasks/buckets';

const TODAY_ISO = '2026-04-22';
const TODAY_DATE = new Date('2026-04-22T09:00:00');

describe('bucketOf', () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(TODAY_DATE); });
  afterAll(() => { vi.useRealTimers(); });

  it('returns Later when dueDate is null', () => {
    expect(bucketOf(null, TODAY_ISO)).toBe('Later');
  });
  it('returns Overdue when past', () => {
    expect(bucketOf('2026-04-20', TODAY_ISO)).toBe('Overdue');
  });
  it('returns Today when same day', () => {
    expect(bucketOf('2026-04-22', TODAY_ISO)).toBe('Today');
  });
  it('returns Tomorrow for +1', () => {
    expect(bucketOf('2026-04-23', TODAY_ISO)).toBe('Tomorrow');
  });
  it('returns This week for +2..+6', () => {
    expect(bucketOf('2026-04-25', TODAY_ISO)).toBe('This week');
    expect(bucketOf('2026-04-28', TODAY_ISO)).toBe('This week');
  });
  it('returns month abbreviation for beyond this week within year', () => {
    expect(bucketOf('2026-05-03', TODAY_ISO)).toBe('MAY');
    expect(bucketOf('2026-06-10', TODAY_ISO)).toBe('JUN');
  });
});

describe('orderBuckets', () => {
  it('orders Overdue/Today/Tomorrow/This week first, then months by date, Later last', () => {
    const input = ['MAY', 'Later', 'Today', 'Tomorrow', 'JUN', 'This week', 'Overdue'];
    expect(orderBuckets(input, TODAY_ISO)).toEqual([
      'Overdue', 'Today', 'Tomorrow', 'This week', 'MAY', 'JUN', 'Later',
    ]);
  });
});
