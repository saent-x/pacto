import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  router: routerSpy,
  useRouter: () => routerSpy,
  Stack: { Screen: () => null },
  Link: ({ children }: any) => <>{children}</>,
}));

vi.mock('expo-constants', () => ({ default: { statusBarHeight: 44 } }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-reanimated', () => {
  const Reactx = require('react');
  const MockView = (props: any) => Reactx.createElement('AnimatedView', props, props.children);
  const MockScrollView = (props: any) =>
    Reactx.createElement('AnimatedScrollView', props, props.children);
  const fadeInDown: any = {
    duration: () => fadeInDown,
    delay: () => fadeInDown,
    springify: () => fadeInDown,
    damping: () => fadeInDown,
  };
  return {
    __esModule: true,
    default: { View: MockView, ScrollView: MockScrollView, createAnimatedComponent: (C: any) => C },
    View: MockView,
    ScrollView: MockScrollView,
    createAnimatedComponent: (C: any) => C,
    FadeIn: fadeInDown,
    FadeInDown: fadeInDown,
    Easing: { inOut: () => 0, out: () => 0, ease: 0 },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    runOnJS: (fn: any) => fn,
  };
});

const sessionState = vi.hoisted(() => ({
  status: 'ready' as any,
  user: { id: 'me', email: 'a@b', displayName: 'Mattia', avatarUrl: null } as any,
  profile: null as any,
  activeCouple: { couple: { id: 'c1', name: null, anniversary: null }, memberCount: 2, partner: null } as any,
  space: { id: 'c1', kind: 'couple' } as any,
  partner: null as any,
  isSolo: false,
  isCouple: true,
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionState,
}));

const loveNotesState = vi.hoisted(() => ({
  notes: [] as any[],
  isLoading: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/useLoveNotes', () => ({ useLoveNotes: () => loveNotesState }));

const checkinsState = vi.hoisted(() => ({
  today: '2026-04-23',
  checkIns: [] as any[],
  todayCheckIns: [] as any[],
  myTodayCheckIn: null as any,
  partnerTodayCheckIn: null as any,
  isLoading: false,
  isSubmitting: false,
  createOrUpdate: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/useCheckIns', () => ({
  useCheckIns: () => checkinsState,
  getLocalDateKey: () => '2026-04-23',
}));

const expensesState = vi.hoisted(() => ({
  expenses: [] as any[],
  unsettled: [] as any[],
  settled: [] as any[],
  isLoading: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  settle: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/useExpenses', () => ({ useExpenses: () => expensesState }));

const wishlistsState = vi.hoisted(() => ({
  wishlists: [] as any[],
  isLoading: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/useWishlists', () => ({ useWishlists: () => wishlistsState }));

const milestonesState = vi.hoisted(() => ({
  milestones: [] as any[],
  upcoming: [] as any[],
  past: [] as any[],
  isLoading: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/useMilestones', () => ({ useMilestones: () => milestonesState }));

const plansState = vi.hoisted(() => ({
  plans: [] as any[],
  isLoading: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/usePlans', () => ({ usePlans: () => plansState }));

const journalState = vi.hoisted(() => ({
  entries: [] as any[],
  allEntries: [] as any[],
  filter: 'all' as const,
  setFilter: vi.fn(),
  isLoading: false,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  uploadJournalImage: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/src/hooks/useJournal', () => ({ useJournal: () => journalState }));

const dbState = vi.hoisted(() => ({
  wlItems: [] as any[],
  timetables: [] as any[],
  loading: false,
}));
vi.mock('@/src/lib/instant', () => ({
  db: {
    useQuery: (q: any) => {
      if (!q) return { data: {}, isLoading: false, error: null };
      if (q.wishlistItems) {
        return { data: { wishlistItems: dbState.wlItems }, isLoading: dbState.loading, error: null };
      }
      if (q.timetables) {
        return { data: { timetables: dbState.timetables }, isLoading: dbState.loading, error: null };
      }
      return { data: {}, isLoading: false, error: null };
    },
  },
  id: () => 'mock-id',
}));

import UsIndex from '@/app/(tabs)/us/index';

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

const flush = () => new Promise((r) => setTimeout(r, 0));

function readText(root: any): string[] {
  return root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'));
}

function findByTestID(root: any, id: string) {
  return root.findAll((n: any) => n.props?.testID === id);
}

async function render() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<UsIndex />);
    await flush();
  });
  return renderer;
}

function resetAll() {
  routerSpy.push.mockReset();
  loveNotesState.notes = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }];
  loveNotesState.isLoading = false;
  checkinsState.todayCheckIns = [{ id: 'c' }];
  checkinsState.myTodayCheckIn = { id: 'c', authorId: 'me', mood: 'good', note: null, isPrivate: false, checkInDate: '2026-04-23', createdAt: 0 };
  checkinsState.isLoading = false;
  expensesState.unsettled = [{ id: 'e1', amount: 42 }, { id: 'e2', amount: 80 }];
  expensesState.isLoading = false;
  wishlistsState.wishlists = [{ id: 'w1' }, { id: 'w2' }];
  wishlistsState.isLoading = false;
  milestonesState.upcoming = [
    { id: 'm1', title: '3rd anniversary', date: '2026-04-26' },
  ];
  milestonesState.isLoading = false;
  plansState.plans = [{ id: 'p1', title: 'Venice trip' }, { id: 'p2', title: 'Apartment' }];
  plansState.isLoading = false;
  journalState.allEntries = [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }, { id: 'j4' }];
  journalState.isLoading = false;
  dbState.wlItems = new Array(14).fill(0).map((_, i) => ({ id: `wi${i}` }));
  dbState.timetables = [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }];
  dbState.loading = false;
}

describe('UsIndex', () => {
  beforeEach(() => {
    resetAll();
  });

  it('renders the date pill copy', async () => {
    const renderer = await render();
    expect(readText(renderer.root)).toContain('THU · 17 · 11 · MATTIA × SOFIA');
    act(() => renderer.unmount());
  });

  it('renders mood slabs and sync kicker', async () => {
    const renderer = await render();
    const text = readText(renderer.root);
    expect(text).toContain('YOU');
    expect(text).toContain('SOFIA');
    expect(text).toContain('Good');
    expect(text).toContain('Bright');
    expect(text).toContain('◇ 86% IN SYNC · 4-DAY STREAK');
    act(() => renderer.unmount());
  });

  it('renders quote overline + italic body', async () => {
    const renderer = await render();
    const text = readText(renderer.root);
    expect(text).toContain('NOTE OF THE DAY · FROM SOFIA · 7:14 AM');
    expect(text.some((t: string) => t.startsWith('Morning sunshine'))).toBe(true);
    act(() => renderer.unmount());
  });

  it('tapping countdown navigates to /us/milestones', async () => {
    const renderer = await render();
    const cd = findByTestID(renderer.root, 'us-countdown')[0];
    await act(async () => {
      await cd.props.onPress();
    });
    expect(routerSpy.push).toHaveBeenCalledWith('/us/milestones');
    act(() => renderer.unmount());
  });

  it('renders hook-derived counts/subs on every feature card', async () => {
    const renderer = await render();
    const text = readText(renderer.root);
    // notes (big variant) renders ghost count = "3"
    expect(text).toContain('3');
    // checkins (flat) shows sub only — "You · good"
    expect(text).toContain('You · good');
    // expenses (flat) shows sub only — "2 owed"
    expect(text).toContain('2 owed');
    // wishlists (default) count = items length
    expect(text).toContain('14');
    // milestones upcoming = 3 days from 2026-04-23 to 2026-04-26
    expect(text).toContain('3d');
    // plans default sub = first plan title
    expect(text).toContain('Venice trip');
    // timetables sub = "4 rhythms"
    expect(text).toContain('4 rhythms');
    // journal sub = "4 entries"
    expect(text).toContain('4 entries');
    act(() => renderer.unmount());
  });

  it('every card pushes its href on press', async () => {
    const renderer = await render();
    const expected = [
      ['notes', '/us/notes'],
      ['checkins', '/us/checkins'],
      ['expenses', '/us/expenses'],
      ['wishlists', '/us/wishlists'],
      ['milestones', '/us/milestones'],
      ['plans', '/us/plans'],
      ['timetables', '/us/timetables'],
      ['journal', '/us/journal'],
    ] as const;
    for (const [key, href] of expected) {
      routerSpy.push.mockClear();
      const card = findByTestID(renderer.root, `us-card-${key}`)[0];
      expect(card).toBeDefined();
      await act(async () => {
        await card.props.onPress();
      });
      expect(routerSpy.push).toHaveBeenCalledWith(href);
    }
    act(() => renderer.unmount());
  });

  it('falls back to placeholders while hooks are loading', async () => {
    loveNotesState.isLoading = true;
    checkinsState.isLoading = true;
    expensesState.isLoading = true;
    wishlistsState.isLoading = true;
    milestonesState.isLoading = true;
    plansState.isLoading = true;
    journalState.isLoading = true;
    dbState.loading = true;
    const renderer = await render();
    const text = readText(renderer.root);
    expect(text).toContain('124'); // notes (big) ghost count placeholder
    expect(text).toContain('You · good'); // checkins (flat) sub placeholder
    expect(text).toContain('Sofia owes €42'); // expenses (flat) sub placeholder
    expect(text).toContain('184'); // journal default count placeholder
    expect(text).toContain('Venice · 3d'); // plans sub placeholder
    act(() => renderer.unmount());
  });

  it('matches snapshot with loaded data', async () => {
    const renderer = await render();
    expect(renderer.toJSON()).toMatchSnapshot();
    act(() => renderer.unmount());
  });
});
