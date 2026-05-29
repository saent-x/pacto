import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const entityRefState = vi.hoisted(() => ({
  entity: null as any,
}));

vi.mock('react-native', () => ({
  Platform: { select: (options: any) => options.ios ?? options.default },
  StyleSheet: { create: (styles: any) => styles },
  Text: 'Text',
  View: 'View',
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn() },
}));

vi.mock('@/src/hooks/memories/useEntityRef', () => ({
  useEntityRef: () => ({ entity: entityRefState.entity, isLoading: false }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#111111',
      accent2: '#222222',
      accent2Soft: '#eeeeee',
      bgCard: '#ffffff',
      ink2: '#444444',
      ink3: '#666666',
      inkColor: '#000000',
      lineColor: '#dddddd',
    },
  }),
}));

vi.mock('@/src/components/ui/Icon', () => ({
  Icon: ({ name }: any) => React.createElement('Icon', { name }),
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, ...props }: any) =>
    React.createElement('PressScale', props, children),
}));

vi.mock('@/src/components/ui/pacto/Checkbox', () => ({
  Checkbox: ({ checked }: any) => React.createElement('Checkbox', { checked }),
}));

vi.mock('@/src/components/ui/pacto/PriorityDot', () => ({
  PriorityDot: ({ level }: any) => React.createElement('PriorityDot', { level }),
}));

import {
  EntityRefCard,
  entityRefRoute,
} from '@/src/components/ui/pacto/memories/EntityRefCard';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

function readText(root: any): string[] {
  return root
    .findAll((node: any) => typeof node.children?.[0] === 'string')
    .flatMap((node: any) => node.children.filter((child: any) => typeof child === 'string'));
}

function priorityDotLevels(root: any): string[] {
  return root.findAllByType('PriorityDot').map((node: any) => node.props.level);
}

async function renderCard(props: React.ComponentProps<typeof EntityRefCard>) {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(EntityRefCard, props));
  });
  return renderer;
}

describe('entityRefRoute', () => {
  it('routes task references to their owning list when list is a has-one object', () => {
    expect(
      entityRefRoute('task', 'task-1', {
        list: { id: 'list-1' },
      }),
    ).toBe('/(tabs)/us/tasks/list-1?taskId=task-1');
  });

  it('routes task references to their owning list when list is a relation array', () => {
    expect(
      entityRefRoute('task', 'task-1', {
        list: [{ id: 'list-1' }],
      }),
    ).toBe('/(tabs)/us/tasks/list-1?taskId=task-1');
  });
});

describe('EntityRefCard', () => {
  beforeEach(() => {
    entityRefState.entity = null;
  });

  it('keeps malformed numeric check-in timestamps from crashing attachment cards', async () => {
    entityRefState.entity = {
      id: 'checkin-1',
      mood: 'great',
      note: 'Still visible',
      createdAt: Number.MAX_VALUE,
    };

    const renderer = await renderCard({
      type: 'checkIn',
      refId: 'checkin-1',
      spaceId: 'space-1',
    });

    expect(readText(renderer.root)).toContain('Still visible');
    act(() => renderer.unmount());
  });

  it('keeps malformed numeric timetable timestamps from crashing attachment cards', async () => {
    entityRefState.entity = {
      id: 'timetable-1',
      title: 'Meal plan',
      template: 'mealPlan',
      share: 'shared',
      updatedAt: Number.MAX_VALUE,
    };

    const renderer = await renderCard({
      type: 'timetable',
      refId: 'timetable-1',
      spaceId: 'space-1',
    });

    expect(readText(renderer.root)).toContain('Meal plan');
    act(() => renderer.unmount());
  });

  it('keeps malformed numeric journal timestamps from crashing attachment cards', async () => {
    entityRefState.entity = {
      id: 'journal-1',
      title: 'Small note',
      body: 'Details',
      createdAt: Number.MAX_VALUE,
    };

    const renderer = await renderCard({
      type: 'journal',
      refId: 'journal-1',
      spaceId: 'space-1',
    });

    expect(readText(renderer.root)).toContain('Small note');
    act(() => renderer.unmount());
  });

  it.each([
    ['task', { id: 'task-1', title: 'Legacy task', priority: Number.MAX_VALUE }],
    ['reminder', { id: 'reminder-1', title: 'Legacy reminder', priority: Number.MAX_VALUE }],
    ['plan', { id: 'plan-1', title: 'Legacy target', priority: Number.MAX_VALUE }],
  ] as const)('normalizes malformed legacy %s priorities before rendering attachment cards', async (type, entity) => {
    entityRefState.entity = entity;

    const renderer = await renderCard({
      type,
      refId: entity.id,
      spaceId: 'space-1',
    });

    expect(priorityDotLevels(renderer.root)).toEqual(['none']);
    act(() => renderer.unmount());
  });
});
