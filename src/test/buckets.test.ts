import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bucketOf, orderBuckets, formatDueChip } from '@/src/components/tasks/buckets';

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
  it('treats impossible due dates as Later instead of rolling them into a real date', () => {
    expect(bucketOf('2026-04-31', TODAY_ISO)).toBe('Later');
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

describe('formatDueChip', () => {
  it('returns null for null', () => expect(formatDueChip(null)).toBeNull());
  it('returns TODAY for today', () => expect(formatDueChip(TODAY_ISO, TODAY_ISO)).toBe('TODAY'));
  it('returns TOMORROW for +1', () => expect(formatDueChip('2026-04-23', TODAY_ISO)).toBe('TOMORROW'));
  it('formats month + zero-padded day for future dates', () =>
    expect(formatDueChip('2026-05-03', TODAY_ISO)).toBe('MAY 03'));
  it('hides impossible due-date chips instead of rolling them into a real date', () =>
    expect(formatDueChip('2026-04-31', TODAY_ISO)).toBeNull());
});
