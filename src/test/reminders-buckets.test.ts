import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  bucketOfDue,
  formatWhenChip,
  isOverdue,
  orderReminderBuckets,
} from '@/src/components/reminders/buckets';

const NOW = new Date('2026-04-22T09:00:00');
const iso = (s: string) => new Date(s).toISOString();

describe('bucketOfDue', () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterAll(() => { vi.useRealTimers(); });

  it('returns Today when due later today', () => {
    expect(bucketOfDue(iso('2026-04-22T18:00:00'))).toBe('Today');
  });
  it('returns Overdue when earlier same day', () => {
    expect(bucketOfDue(iso('2026-04-22T08:00:00'))).toBe('Overdue');
  });
  it('returns Overdue when previous day', () => {
    expect(bucketOfDue(iso('2026-04-21T22:00:00'))).toBe('Overdue');
  });
  it('returns Tomorrow for +1 day', () => {
    expect(bucketOfDue(iso('2026-04-23T10:00:00'))).toBe('Tomorrow');
  });
  it('returns This week for +2..+6 days', () => {
    expect(bucketOfDue(iso('2026-04-25T12:00:00'))).toBe('This week');
    expect(bucketOfDue(iso('2026-04-28T12:00:00'))).toBe('This week');
  });
  it('returns month abbreviation beyond this week', () => {
    expect(bucketOfDue(iso('2026-05-03T12:00:00'))).toBe('MAY');
    expect(bucketOfDue(iso('2026-06-10T12:00:00'))).toBe('JUN');
  });
});

describe('orderReminderBuckets', () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterAll(() => { vi.useRealTimers(); });

  it('orders fixed labels first, months next, Later last', () => {
    const input = ['MAY', 'Later', 'Today', 'Tomorrow', 'JUN', 'This week', 'Overdue'];
    expect(orderReminderBuckets(input)).toEqual([
      'Overdue', 'Today', 'Tomorrow', 'This week', 'MAY', 'JUN', 'Later',
    ]);
  });
});

describe('formatWhenChip', () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterAll(() => { vi.useRealTimers(); });

  it('returns HH:MM for same day', () => {
    expect(formatWhenChip(iso('2026-04-22T18:30:00'))).toBe('18:30');
  });
  it('returns Yesterday for previous day', () => {
    expect(formatWhenChip(iso('2026-04-21T10:00:00'))).toBe('Yesterday');
  });
  it('returns Tomorrow · HH:MM for +1', () => {
    expect(formatWhenChip(iso('2026-04-23T14:05:00'))).toBe('Tomorrow · 14:05');
  });
  it('returns weekday · HH:MM within the week', () => {
    expect(formatWhenChip(iso('2026-04-25T10:00:00'))).toBe('Sat · 10:00');
  });
  it('returns month day past the week', () => {
    expect(formatWhenChip(iso('2026-05-03T09:00:00'))).toBe('MAY 3');
  });
});

describe('isOverdue', () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterAll(() => { vi.useRealTimers(); });

  it('is true when due_at < now and not completed', () => {
    expect(isOverdue(iso('2026-04-22T08:00:00'), false)).toBe(true);
  });
  it('is false when completed', () => {
    expect(isOverdue(iso('2026-04-22T08:00:00'), true)).toBe(false);
  });
  it('is false when due_at is in the future', () => {
    expect(isOverdue(iso('2026-04-22T12:00:00'), false)).toBe(false);
  });
});
