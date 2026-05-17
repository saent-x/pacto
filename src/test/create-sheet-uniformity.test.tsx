import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SHEETS_DIR = join(__dirname, '..', '..', 'app', 'sheets');

const CREATE_SHEETS = [
  'new-list.tsx',
  'new-plan.tsx',
  'new-wish.tsx',
  'new-timetable.tsx',
  'new-timetable-item.tsx',
  'new-checkin.tsx',
  'new-entry.tsx',
  'new-milestone.tsx',
  'new-note.tsx',
  'new-reminder.tsx',
  'new-task.tsx',
];

function read(name: string) {
  return readFileSync(join(SHEETS_DIR, name), 'utf8');
}

describe('Create sheet uniformity', () => {
  it('every create sheet exists in app/sheets/', () => {
    const found = new Set(readdirSync(SHEETS_DIR));
    for (const f of CREATE_SHEETS) {
      expect(found.has(f), `missing sheet: ${f}`).toBe(true);
    }
  });

  it('every create sheet uses SheetShell + SheetSection', () => {
    for (const f of CREATE_SHEETS) {
      const src = read(f);
      expect(src, `${f} must import SheetShell`).toMatch(/SheetShell/);
      expect(src, `${f} must use SheetSection`).toMatch(/SheetSection/);
    }
  });

  it('no create sheet imports DateTimePicker directly', () => {
    for (const f of CREATE_SHEETS) {
      const src = read(f);
      expect(
        src.includes('@react-native-community/datetimepicker'),
        `${f} must use SheetDateField/SheetTimeField, not DateTimePicker directly`,
      ).toBe(false);
    }
  });

  it('sheets touching dates use SheetDateField/SheetTimeField', () => {
    const dateSheets = ['new-milestone.tsx', 'new-reminder.tsx'];
    for (const f of dateSheets) {
      const src = read(f);
      expect(src, `${f} must use SheetDateField`).toMatch(/SheetDateField/);
    }
    expect(read('new-reminder.tsx'), 'new-reminder must use SheetTimeField').toMatch(
      /SheetTimeField/,
    );
    expect(read('new-timetable-item.tsx'), 'new-timetable-item must use SheetTimeField').toMatch(
      /SheetTimeField/,
    );
  });

  it('new-timetable-item uses SheetDurationField (no fixed-pill duration)', () => {
    const src = read('new-timetable-item.tsx');
    expect(src).toMatch(/SheetDurationField/);
    expect(src.includes('const DURATIONS')).toBe(false);
  });

  it('documents each non-icon-grid category exception with a comment', () => {
    const ttSrc = read('new-timetable.tsx');
    expect(ttSrc, 'new-timetable template grid must carry an EXCEPTION comment').toMatch(
      /EXCEPTION/,
    );
    const taskSrc = read('new-task.tsx');
    expect(taskSrc, 'new-task bucket pills must carry an EXCEPTION comment').toMatch(/EXCEPTION/);
  });
});
