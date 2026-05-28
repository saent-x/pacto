import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SHEETS_DIR = join(__dirname, '..', '..', 'app', 'sheets');
const ROOT_LAYOUT = join(__dirname, '..', '..', 'app', '_layout.tsx');

const CREATE_SHEETS = [
  'new-list.tsx',
  'new-plan.tsx',
  'new-timetable.tsx',
  'new-timetable-item.tsx',
  'new-checkin.tsx',
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

  it('sheets touching dates use shared native date/time sheet controls', () => {
    const dateSheets = ['new-plan.tsx', 'new-reminder.tsx', 'new-task.tsx'];
    for (const f of dateSheets) {
      const src = read(f);
      expect(src, `${f} must use SheetDateField`).toMatch(/SheetDateField/);
      expect(src, `${f} date section must use the shared SheetRow layout`).toMatch(/SheetRow/);
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

  it('uses shared choice controls for label-based sheet selections', () => {
    const ttSrc = read('new-timetable.tsx');
    expect(ttSrc, 'new-timetable template choices must carry the explicit template-tile exception').toMatch(
      /EXCEPTION: timetable templates use compact descriptive tiles/,
    );
    expect(ttSrc, 'new-timetable template cards must expose the shared template descriptions').toMatch(
      /t\.description/,
    );
    const planSrc = read('new-plan.tsx');
    expect(planSrc, 'new-plan should infer target bucket from the native date field').not.toMatch(
      /new-plan-bucket/,
    );
    const taskSrc = read('new-task.tsx');
    expect(taskSrc, 'new-task bucket pills must carry an EXCEPTION comment').toMatch(/EXCEPTION/);
  });

  it('native route sheets size themselves to content', () => {
    const src = readFileSync(ROOT_LAYOUT, 'utf8');
    expect(src, 'route-backed sheets should use shared detent constant').toMatch(
      /sheetAllowedDetents:\s*SHEET_DETENTS/,
    );
    expect(src, 'SHEET_DETENTS should fit native sheets to content height').toMatch(
      /SHEET_DETENTS\s*=\s*['"]fitToContents['"]/,
    );
    expect(src, 'route-backed sheets should open at the initial detent').toMatch(
      /sheetInitialDetentIndex:\s*SHEET_INITIAL_DETENT_INDEX/,
    );
  });
});
