import test from 'node:test';
import assert from 'node:assert/strict';
import { nextOccurrence, nextOccurrenceAfter } from './recurrence.ts';

// Read back the local calendar components of an epoch in a given zone.
function parts(epoch, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const m = {};
  for (const p of dtf.formatToParts(new Date(epoch))) if (p.type !== 'literal') m[p.type] = p.value;
  if (m.hour === '24') m.hour = '00';
  return m;
}

test('Once / unknown rules do not recur', () => {
  const base = Date.UTC(2026, 5, 6, 18, 0);
  assert.equal(nextOccurrence(base, 'Once', 'UTC'), null);
  assert.equal(nextOccurrence(base, 'Nope', 'Europe/London'), null);
});

test('Daily preserves the local time-of-day across a DST spring-forward (Europe/London)', () => {
  // 2026-03-28 18:00 London is GMT (UTC+0); the clocks jump on 2026-03-29.
  const base = Date.UTC(2026, 2, 28, 18, 0); // 18:00 London == 18:00 UTC that day
  const next = nextOccurrence(base, 'Daily', 'Europe/London');
  const p = parts(next, 'Europe/London');
  assert.equal(p.day, '29');
  assert.equal(p.hour, '18'); // still 6 PM local, even though the UTC offset changed
  assert.equal(p.minute, '00');
});

test('Weekly adds 7 local days', () => {
  const base = Date.UTC(2026, 5, 6, 17, 30); // Jun 6 2026
  const next = nextOccurrence(base, 'Weekly', 'America/New_York');
  const p = parts(next, 'America/New_York');
  assert.equal(p.month, '06');
  assert.equal(p.day, '13');
});

test('Weekdays skips the weekend in the user local zone, not UTC (America/Los_Angeles)', () => {
  // Friday 2026-06-05 21:00 PDT == 2026-06-06 04:00 UTC (UTC date is Saturday).
  const base = Date.UTC(2026, 5, 6, 4, 0);
  const p0 = parts(base, 'America/Los_Angeles');
  assert.equal(p0.weekday, 'Fri'); // sanity: base is Friday locally
  const next = nextOccurrence(base, 'Weekdays', 'America/Los_Angeles');
  const p = parts(next, 'America/Los_Angeles');
  // Must land on Monday Jun 8 (NOT Sunday Jun 7, which the old getUTCDay() logic produced).
  assert.equal(p.weekday, 'Mon');
  assert.equal(p.day, '08');
  assert.equal(p.hour, '21');
});

test('Weekdays from a Tuesday goes to Wednesday', () => {
  const base = Date.UTC(2026, 5, 9, 12, 0); // Tue Jun 9 2026
  const next = nextOccurrence(base, 'Weekdays', 'UTC');
  assert.equal(parts(next, 'UTC').weekday, 'Wed');
});

test('Monthly clamps Jan 31 to Feb 28 instead of overflowing to March', () => {
  // 2026-01-31 09:00 America/New_York (EST, UTC-5) == 14:00 UTC.
  const base = Date.UTC(2026, 0, 31, 14, 0);
  const next = nextOccurrence(base, 'Monthly', 'America/New_York');
  const p = parts(next, 'America/New_York');
  assert.equal(p.month, '02');
  assert.equal(p.day, '28'); // 2026 is not a leap year; Feb has 28 days
  assert.equal(p.hour, '09');
});

test('Monthly keeps the same day for a normal month', () => {
  const base = Date.UTC(2026, 5, 15, 9, 0); // Jun 15
  const next = nextOccurrence(base, 'Monthly', 'UTC');
  const p = parts(next, 'UTC');
  assert.equal(p.month, '07');
  assert.equal(p.day, '15');
});

test('nextOccurrenceAfter collapses missed periods into a single future fire', () => {
  const base = Date.UTC(2026, 0, 1, 9, 0); // long ago relative to `after`
  const after = Date.UTC(2026, 5, 1, 0, 0);
  const next = nextOccurrenceAfter(base, 'Daily', 'UTC', after);
  assert.ok(next > after, 'next must be strictly after the cutoff');
  // And it should be the FIRST daily occurrence after the cutoff, not far beyond.
  assert.ok(next - after <= 24 * 60 * 60 * 1000, 'should be within one day of the cutoff');
  assert.equal(parts(next, 'UTC').hour, '09');
});
