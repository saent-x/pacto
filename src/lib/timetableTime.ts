export const TIMETABLE_TIME_STEP_MINUTES = 1;
export const TIMETABLE_DURATION_STEP_MINUTES = 1;
export const TIMETABLE_DURATION_DEFAULT_MINUTES = 30;
export const TIMETABLE_DURATION_MIN_MINUTES = 15;
export const TIMETABLE_DURATION_MAX_MINUTES = 24 * 60;
const MINUTES_PER_DAY = 24 * 60;

export function normalizeTimetableTime(input: string, fallback = '9:00') {
  const minutes = parseTimetableTimeMinutes(input);
  if (minutes === null) return fallback;
  return formatTimetableTimeMinutes(minutes);
}

export function parseTimetableTimeMinutes(input: string) {
  const raw = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!raw || /[^0-9:apm]/.test(raw) || raw.length > 7) return null;
  const suffix = raw.endsWith('am') ? 'am' : raw.endsWith('pm') ? 'pm' : undefined;
  const body = suffix ? raw.slice(0, -2) : raw;
  let hour: number;
  let minute: number;

  if (body.includes(':')) {
    const [h, m] = body.split(':');
    if (!h || body.indexOf(':') !== body.lastIndexOf(':')) return null;
    hour = Number(h);
    minute = m ? Number(m) : 0;
  } else if (/^\d{1,4}$/.test(body)) {
    if (body.length <= 2) {
      hour = Number(body);
      minute = 0;
    } else if (body.length === 3) {
      if (Number(body[0]) > 2) {
        hour = Number(body.slice(0, 1));
        minute = Number(body.slice(1));
      } else {
        hour = Number(body.slice(0, 2));
        minute = Number(body.slice(2));
      }
    } else {
      hour = Number(body.slice(0, 2));
      minute = Number(body.slice(2));
    }
  } else {
    return null;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === 'am') hour = hour === 12 ? 0 : hour;
    if (suffix === 'pm') hour = hour === 12 ? 12 : hour + 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return hour * 60 + minute;
}

export function formatTimetableTimeMinutes(minutes: number) {
  const safeMinutes = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

export function formatTimetableTimeLabel(input: string, fallback = '9:00') {
  return formatTimetableTimeLabelMinutes(timetableTimeMinutes(input, fallback));
}

export function formatTimetableTimeLabelMinutes(minutes: number) {
  const safeMinutes = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour24 = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  const hour12 = hour24 % 12 || 12;
  const period = hour24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function timetableTimeMinutes(input: string | undefined, fallback = '9:00') {
  return parseTimetableTimeMinutes(input ?? '') ?? parseTimetableTimeMinutes(fallback) ?? 9 * 60;
}

export function parseTimetableDurationMinutes(input: string) {
  const raw = input.trim().toLowerCase();
  if (!raw || /[^0-9hm]/.test(raw) || raw.length > 6) return null;

  let minutes: number;
  const bare = raw.match(/^(\d{1,4})$/);
  const mins = raw.match(/^(\d{1,4})m$/);
  const hours = raw.match(/^(\d{1,2})h$/);
  const mixed = raw.match(/^(\d{1,2})h(\d{1,2})m?$/);

  if (bare) {
    minutes = Number(bare[1]);
  } else if (mins) {
    minutes = Number(mins[1]);
  } else if (hours) {
    minutes = Number(hours[1]) * 60;
  } else if (mixed) {
    const h = Number(mixed[1]);
    const m = Number(mixed[2]);
    if (m > 59) return null;
    minutes = h * 60 + m;
  } else {
    return null;
  }

  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > TIMETABLE_DURATION_MAX_MINUTES) return null;

  return minutes;
}

export function formatTimetableDurationMinutes(minutes: number) {
  const safeMinutes = Math.min(TIMETABLE_DURATION_MAX_MINUTES, Math.max(TIMETABLE_DURATION_MIN_MINUTES, minutes));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function normalizeTimetableDuration(input: string, fallback = '') {
  if (!input.trim()) return '';
  const minutes = parseTimetableDurationMinutes(input);
  if (!minutes) return fallback;
  return formatTimetableDurationMinutes(minutes);
}

export function timetableDurationMinutes(input: string | undefined, fallback = TIMETABLE_DURATION_DEFAULT_MINUTES) {
  return parseTimetableDurationMinutes(input ?? '') ?? fallback;
}
