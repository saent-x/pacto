import {
  itemOptionForTemplate,
  itemOptionsForTemplate,
  normalizeTemplateKey,
  normalizeWho,
  tmplByKey,
} from '@/src/lib/timetables-data';

describe('timetable data helpers', () => {
  it('normalizes timetable assignment keys and preserves legacy partner rows', () => {
    expect(normalizeWho('me')).toBe('me');
    expect(normalizeWho('partner')).toBe('partner');
    expect(normalizeWho('sofia')).toBe('partner');
    expect(normalizeWho('both')).toBe('both');
    expect(normalizeWho('unknown')).toBe('both');
  });

  it('normalizes legacy or missing templates to the closest designed template', () => {
    expect(normalizeTemplateKey('fitness')).toBe('workout');
    expect(normalizeTemplateKey('weekly')).toBe('routine');
    expect(normalizeTemplateKey('custom', 'Meal plan')).toBe('meals');
    expect(normalizeTemplateKey(undefined, 'Bedtime wind-down')).toBe('sleep');
    expect(normalizeTemplateKey('custom', 'Test Plan')).toBe('custom');
  });

  it('exposes distinct display metadata for every timetable template', () => {
    expect(tmplByKey('meals')).toMatchObject({
      icon: 'coffee',
      shortLabel: 'Meals',
      defaultTitle: 'Meal plan',
    });
    expect(tmplByKey('workout')).toMatchObject({
      icon: 'activity',
      shortLabel: 'Workout',
      defaultTitle: 'Workout plan',
    });
    expect(tmplByKey('routine')).toMatchObject({
      icon: 'sun',
      shortLabel: 'Ritual',
      defaultTitle: 'Ritual',
    });
  });

  it('exposes curated item options for each timetable template', () => {
    expect(itemOptionsForTemplate('meals').map((o) => o.key)).toEqual([
      'none',
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ]);
    expect(itemOptionsForTemplate('workout').map((o) => o.key)).toEqual([
      'none',
      'strength',
      'cardio',
      'mobility',
      'recovery',
    ]);
    expect(itemOptionsForTemplate('study').map((o) => o.key)).toEqual([
      'none',
      'focus',
      'reading',
      'admin',
      'break',
    ]);
    expect(itemOptionsForTemplate('routine').map((o) => o.key)).toEqual([
      'none',
      'morning',
      'reset',
      'chore',
      'reflection',
    ]);
    expect(itemOptionsForTemplate('sleep').map((o) => o.key)).toEqual([
      'none',
      'wind-down',
      'bedtime',
      'wake-up',
      'nap',
    ]);
    expect(itemOptionsForTemplate('custom').map((o) => o.key)).toEqual([
      'none',
      'block',
      'task',
      'reminder',
      'note',
    ]);
  });

  it('resolves saved timetable item categories back to template options', () => {
    expect(itemOptionForTemplate('workout', 'cardio')).toMatchObject({
      label: 'Cardio',
      icon: 'zap',
    });
    expect(itemOptionForTemplate('meals', 'Lunch')).toMatchObject({
      key: 'lunch',
      icon: 'feather',
    });
    expect(itemOptionForTemplate('sleep', 'unknown')).toMatchObject({
      key: 'none',
      label: 'None',
    });
  });
});
