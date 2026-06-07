import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dueDateFromOption,
  dueLabelForDate,
  initialDueOption,
  optionalDuePayload,
  optionalDueUpdatePayload,
} from './taskDueDate.ts';

const base = new Date(2026, 5, 6, 9, 15, 0, 0);
const dueMs = (year, monthIndex, day) => new Date(year, monthIndex, day, 18, 0, 0, 0).getTime();

test('No date produces an empty task due payload', () => {
  assert.deepEqual(optionalDuePayload('No date', base), {});
});

test('Today and Tomorrow use 6 PM on the chosen local day', () => {
  assert.deepEqual(optionalDuePayload('Today', base), {
    dueAt: dueMs(2026, 5, 6),
    dueLabel: 'Today',
  });
  assert.deepEqual(optionalDuePayload('Tomorrow', base), {
    dueAt: dueMs(2026, 5, 7),
    dueLabel: 'Tomorrow',
  });
});

test('Pick date formats a stable short date label', () => {
  const picked = new Date(2026, 5, 12, 3, 0, 0, 0);
  assert.deepEqual(optionalDuePayload('Pick date', picked), {
    dueAt: dueMs(2026, 5, 12),
    dueLabel: 'Jun 12',
  });
});

test('Existing task due values map back to initial sheet state', () => {
  assert.equal(initialDueOption(undefined), 'No date');
  assert.equal(initialDueOption('Today'), 'Today');
  assert.equal(initialDueOption('Tomorrow'), 'Tomorrow');
  assert.equal(initialDueOption('Jun 12'), 'Pick date');
});

test('Picked dates preserve their day while normalizing to due hour', () => {
  const picked = dueDateFromOption('Pick date', new Date(2026, 5, 20, 23, 59, 0, 0));
  assert.equal(picked.getFullYear(), 2026);
  assert.equal(picked.getMonth(), 5);
  assert.equal(picked.getDate(), 20);
  assert.equal(picked.getHours(), 18);
  assert.equal(picked.getMinutes(), 0);
  assert.equal(picked.getSeconds(), 0);
  assert.equal(dueLabelForDate(picked), 'Jun 20');
});

test('Unchanged edit does not rewrite stored due fields', () => {
  assert.deepEqual(
    optionalDueUpdatePayload({
      editing: true,
      dueChanged: false,
      option: 'Today',
      base: new Date(2026, 5, 6, 9, 15, 0, 0),
    }),
    {},
  );
});

test('Cleared edit explicitly clears stored due fields', () => {
  assert.deepEqual(
    optionalDueUpdatePayload({
      editing: true,
      dueChanged: true,
      option: 'No date',
      base: new Date(2026, 5, 6, 9, 15, 0, 0),
    }),
    { clearDue: true },
  );
});
