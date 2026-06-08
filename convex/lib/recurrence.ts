// Timezone-aware recurrence for repeating reminders.
//
// `remindAt` is an absolute epoch (ms) of a LOCAL wall-clock time the user picked
// (e.g. "6:00 PM"). To keep a recurring reminder at the same local time/day, we
// must advance calendar components in the user's IANA timezone and convert back
// to an absolute epoch — doing the math in UTC drifts across DST and lands on the
// wrong weekday/day-of-month for users far from UTC.

/** True if `tz` is a usable IANA timezone for Intl. */
function isValidZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Calendar components of an instant as seen in `tz` (month is 0-based). */
function partsInZone(instant: number, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(instant))) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // some engines emit '24' for midnight
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset (ms) of `tz` at `instant`: (local wall-clock interpreted as UTC) - instant. */
function zoneOffset(instant: number, tz: string): number {
  const p = partsInZone(instant, tz);
  const asUTC = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second);
  return asUTC - instant;
}

/** Convert local wall-clock components in `tz` to an absolute epoch (ms). */
function zonedToEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tz: string,
): number {
  const guess = Date.UTC(year, month, day, hour, minute, second);
  // The offset at the target instant can differ from `guess` across a DST
  // boundary, so refine once using the offset measured at the corrected instant.
  const off1 = zoneOffset(guess, tz);
  const off2 = zoneOffset(guess - off1, tz);
  return guess - off2;
}

/**
 * Next fire time (epoch ms) for a repeat rule evaluated in `tz`, preserving the
 * user's local time-of-day. Returns null for one-shot ('Once') / unknown rules.
 * The repeat vocabulary matches the reminder sheet: Daily | Weekly | Weekdays | Monthly.
 */
export function nextOccurrence(base: number, repeat: string, tz: string): number | null {
  const zone = tz && isValidZone(tz) ? tz : 'UTC';
  const p = partsInZone(base, zone);
  switch (repeat) {
    case 'Daily':
      return zonedToEpoch(p.year, p.month, p.day + 1, p.hour, p.minute, p.second, zone);
    case 'Weekly':
      return zonedToEpoch(p.year, p.month, p.day + 7, p.hour, p.minute, p.second, zone);
    case 'Weekdays': {
      // Advance day-by-day to the next Mon–Fri in local calendar terms.
      for (let d = p.day + 1, i = 0; i < 7; d++, i++) {
        const cal = new Date(Date.UTC(p.year, p.month, d)); // normalizes month/year rollover
        const wd = cal.getUTCDay(); // weekday of the calendar date (timezone-independent)
        if (wd !== 0 && wd !== 6) {
          return zonedToEpoch(
            cal.getUTCFullYear(),
            cal.getUTCMonth(),
            cal.getUTCDate(),
            p.hour,
            p.minute,
            p.second,
            zone,
          );
        }
      }
      return null; // unreachable: a weekday always exists within 7 days
    }
    case 'Monthly': {
      let month = p.month + 1;
      let year = p.year;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      // Clamp to the last valid day so e.g. the 31st rolls to Feb 28/29 instead
      // of overflowing into the following month.
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(p.day, daysInMonth);
      return zonedToEpoch(year, month, day, p.hour, p.minute, p.second, zone);
    }
    default:
      return null;
  }
}

/**
 * First occurrence strictly after `after` (epoch ms). Collapses any missed
 * periods into a single next-future fire, so a job that runs very late re-arms
 * once instead of bursting one notification per skipped period.
 */
export function nextOccurrenceAfter(
  base: number,
  repeat: string,
  tz: string,
  after: number,
): number | null {
  let next = nextOccurrence(base, repeat, tz);
  // Guard bounds the catch-up loop (≈11 years of daily) against pathological input.
  for (let i = 0; next !== null && next <= after && i < 4096; i++) {
    next = nextOccurrence(next, repeat, tz);
  }
  return next;
}
