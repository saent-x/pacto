import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock('expo-router', () => ({
  router: routerSpy,
  Stack: { Screen: () => null },
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => undefined),
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

vi.mock('expo-constants', () => ({
  default: { statusBarHeight: 44, expoConfig: { version: '1.0.0' } },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  default: (props: any) => props.children,
}));

vi.mock('@/src/lib/theme', async () => {
  const tokens =
    await vi.importActual<typeof import('@/src/lib/tokens')>('@/src/lib/tokens');
  return {
    useTheme: () => ({
      mode: 'light' as const,
      setMode: () => undefined,
      C: tokens.getTokens('light'),
      F: tokens.fonts,
    }),
    ThemeProvider: ({ children }: any) => children,
  };
});

const sessionState = vi.hoisted(() => ({
  user: { id: 'u1', email: 'test@example.com', displayName: 'Vangerwua' },
  partner: null,
  mode: 'solo' as const,
  members: [{ id: 'u1', displayName: 'Vangerwua' }],
  isFeatureEnabled: vi.fn(() => true),
}));
vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const checkInsState = vi.hoisted(() => ({
  checkIns: [] as any[],
  remove: vi.fn(),
}));
const useCheckInsMock = vi.hoisted(() => vi.fn());
vi.mock('@/src/hooks/useCheckIns', () => {
  return {
    getLocalDateKey: (date: Date = new Date()) => date.toISOString().slice(0, 10),
    useCheckIns: () => useCheckInsMock(),
  };
});

import CheckinsScreen from '@/app/(tabs)/us/checkins';
import { SectionHead } from '@/src/components/ui/pacto/SectionHead';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any): string {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function renderScreen() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<CheckinsScreen />);
    await flush();
  });
  return renderer;
}

function earlierCheckIn(index: number) {
  const createdAt = new Date(`2026-05-${String(10 - index).padStart(2, '0')}T12:00:00Z`).getTime();
  return {
    id: `earlier-${index}`,
    authorId: 'u1',
    mood: 'soft',
    note: `Earlier note ${index}`,
    createdAt,
    checkInDate: `2026-05-${String(10 - index).padStart(2, '0')}`,
  };
}

describe('CheckinsScreen history pagination', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2026-05-19T12:00:00Z'),
      toFake: ['Date'],
    });
    sessionState.mode = 'solo';
    sessionState.isFeatureEnabled.mockReturnValue(true);
    checkInsState.remove.mockReset();
    useCheckInsMock.mockReset();
    useCheckInsMock.mockImplementation(() => checkInsState);
    checkInsState.checkIns = [
      {
        id: 'recent',
        authorId: 'u1',
        mood: 'steady',
        note: 'This week note',
        createdAt: new Date('2026-05-18T12:00:00Z').getTime(),
        checkInDate: '2026-05-18',
      },
      ...Array.from({ length: 8 }, (_, i) => earlierCheckIn(i + 1)),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('limits earlier check-ins until show more is pressed and can collapse again', async () => {
    const renderer = await renderScreen();
    let text = readText(renderer.root);

    expect(text).toContain('Earlier note 1');
    expect(text).toContain('Earlier note 5');
    expect(text).not.toContain('Earlier note 6');
    expect(text).toContain('Show 3 more');

    const showMore = renderer.root.findByProps({ testID: 'checkins-show-more-earlier' });
    await act(async () => {
      showMore.props.onPress();
      await flush();
    });

    text = readText(renderer.root);
    expect(text).toContain('Earlier note 6');
    expect(text).toContain('Earlier note 8');
    expect(text).not.toContain('Show 3 more');
    expect(text).toContain('Hide');

    const hide = renderer.root.findByProps({ testID: 'checkins-toggle-earlier' });
    await act(async () => {
      hide.props.onPress();
      await flush();
    });

    text = readText(renderer.root);
    expect(text).toContain('Earlier note 1');
    expect(text).toContain('Earlier note 5');
    expect(text).not.toContain('Earlier note 6');
    expect(text).toContain('Show 3 more');

    act(() => renderer.unmount());
  });

  it('buckets check-ins by check-in date instead of created timestamp', async () => {
    checkInsState.checkIns = [
      {
        id: 'backdated',
        authorId: 'u1',
        mood: 'steady',
        note: 'Saved today for an older check-in date',
        createdAt: new Date('2026-05-19T12:00:00Z').getTime(),
        checkInDate: '2026-05-09',
        isPrivate: true,
      },
    ];

    const renderer = await renderScreen();
    const sectionLabels = renderer.root
      .findAllByType(SectionHead)
      .map((node: any) => node.props.children);
    const text = readText(renderer.root);

    expect(sectionLabels).toContain('Earlier');
    expect(sectionLabels).not.toContain('Today');
    expect(text).toContain('May 9');

    act(() => renderer.unmount());
  });

  it('falls back to the logical check-in date when a current-day row has no created timestamp', async () => {
    checkInsState.checkIns = [
      {
        id: 'legacy-today',
        authorId: 'u1',
        mood: 'steady',
        note: 'Legacy today note',
        createdAt: undefined,
        checkInDate: '2026-05-19',
        isPrivate: true,
      },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root);

    expect(text).toContain('Legacy today note');
    expect(text).toContain('Today');

    act(() => renderer.unmount());
  });

  it('falls back to the logical check-in date when a current-day row has an impossible numeric timestamp', async () => {
    checkInsState.checkIns = [
      {
        id: 'malformed-current-day',
        authorId: 'u1',
        mood: 'steady',
        note: 'Malformed timestamp note',
        createdAt: 9e20,
        checkInDate: '2026-05-19',
        isPrivate: true,
      },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root);

    expect(text).toContain('Malformed timestamp note');
    expect(text).toContain('Today');

    act(() => renderer.unmount());
  });

  it('does not count private personal check-ins as shared in-sync days', async () => {
    sessionState.mode = 'pair';
    sessionState.partner = { id: 'u2', displayName: 'Sam' } as any;
    sessionState.members = [
      { id: 'u1', displayName: 'Vangerwua' },
      { id: 'u2', displayName: 'Sam' },
    ] as any;
    checkInsState.checkIns = [
      {
        id: 'private-mine',
        spaceId: 'solo-1',
        authorId: 'u1',
        mood: 'steady',
        note: null,
        isPrivate: true,
        createdAt: new Date('2026-05-18T12:00:00Z').getTime(),
        checkInDate: '2026-05-18',
      },
      {
        id: 'shared-theirs',
        spaceId: 'shared-1',
        authorId: 'u2',
        mood: 'soft',
        note: null,
        isPrivate: false,
        createdAt: new Date('2026-05-18T13:00:00Z').getTime(),
        checkInDate: '2026-05-18',
      },
    ];

    const renderer = await renderScreen();
    const text = readText(renderer.root);

    expect(text).toContain('0 of 3 in sync');
    expect(text).not.toContain('1 of 3 in sync');

    act(() => renderer.unmount());
  });

  it('renders unavailable before check-in hooks run when the feature is disabled', async () => {
    sessionState.isFeatureEnabled.mockImplementation((featureId: string) => featureId !== 'checkins');

    const renderer = await renderScreen();
    const text = readText(renderer.root);

    expect(useCheckInsMock).not.toHaveBeenCalled();
    expect(text).toContain('Check-ins is unavailable');

    act(() => renderer.unmount());
  });
});
