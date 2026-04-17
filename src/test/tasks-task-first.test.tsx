import React from 'react';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTaskFeed, buildTaskFeedViewState, useTasks } from '@/src/hooks/useTasks';
import * as tasksHooks from '@/src/hooks/useTasks';
import {
  CreateTaskSheet,
  buildTaskComposerState,
  getTaskComposerSaveError,
} from '@/src/components/tasks/CreateTaskSheet';
import { CreateListSheet } from '@/src/components/tasks/CreateListSheet';
import {
  saveTaskFromListDetail,
} from '@/src/components/tasks/listDetailComposer';
import type { Task } from '@/src/types/database';

// TaskList was removed when migrating from Convex to InstantDB; tasks now use a category string.
type TaskList = {
  id: string;
  couple_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by: string;
  created_at: string;
};

const bottomSheetSpies = vi.hoisted(() => ({
  present: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  default: () => null,
}));

vi.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: class {
    present = bottomSheetSpies.present;
    dismiss = bottomSheetSpies.dismiss;
  },
}));

vi.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Swipeable: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  PanGestureHandler: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ listId: 'list-1' }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem }: { data: any[]; renderItem: (item: { item: any }) => React.ReactNode }) => (
    <>
      {data.map((item) => (
        <React.Fragment key={item.id ?? item.title}>
          {renderItem({ item })}
        </React.Fragment>
      ))}
    </>
  ),
}));

vi.mock('expo-haptics', () => ({
  default: {
    notificationAsync: vi.fn(),
    selectionAsync: vi.fn(),
    impactAsync: vi.fn(),
    NotificationFeedbackType: { Success: 'success' },
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  },
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
  AntDesign: () => null,
}));

vi.mock('react-native-reanimated', () => {
  const React = require('react');
  const MockView = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const fadeInDown = {
    duration: () => fadeInDown,
    delay: () => fadeInDown,
  };
  const chainable = () =>
    new Proxy(
      {},
      {
        get: () => (..._args: any[]) => chainable(),
      },
    );

  return {
    __esModule: true,
    default: { View: MockView },
    View: MockView,
    FadeInDown: fadeInDown,
    LinearTransition: chainable(),
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: () => any) => fn(),
    useAnimatedRef: () => ({ current: null }),
    withSpring: (v: any) => v,
    interpolate: () => 0,
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    measure: () => null,
    ReduceMotion: { System: 'system' },
  };
});

vi.mock('@/src/components/ui', () => ({
  ThemedSheet: ({
    sheetRef,
    children,
    footer,
  }: {
    sheetRef?: React.RefObject<{ present?: () => void; dismiss?: () => void } | null>;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) => {
    if (sheetRef) {
      const current = sheetRef.current ?? {};
      current.present = bottomSheetSpies.present;
      current.dismiss = current.dismiss ?? bottomSheetSpies.dismiss;
      sheetRef.current = current as any;
    }

    return (
      <>
        {children}
        {footer}
      </>
    );
  },
  BottomSheetTextInput: (props: any) => <input {...props} />,
  EmptyState: ({ title, description, actionLabel, onAction }: any) => (
    <>
      <div>{title}</div>
      <div>{description}</div>
      {actionLabel ? <button onClick={onAction}>{actionLabel}</button> : null}
    </>
  ),
  OptionSelect: ({ value, options, onChange }: any) => (
    <select value={value} onChange={(e: any) => onChange?.(e.target.value)}>
      {options?.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

// `react-test-renderer` is available in tests but not typed in this project.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

type RealtimeHandlers = {
  onInsert?: (record: Task) => void;
  onUpdate?: (record: Task) => void;
  onDelete?: (record: Task) => void;
};

type MockState = {
  authUserId: string | null;
  coupleId: string | null;
  lists: TaskList[];
  tasks: Task[];
  taskRealtime: RealtimeHandlers;
  nextTaskSeq: number;
  nextListSeq: number;
};

const state = vi.hoisted<MockState>(() => ({
  authUserId: 'user-1',
  coupleId: 'couple-1',
  lists: [],
  tasks: [],
  taskRealtime: {},
  nextTaskSeq: 1,
  nextListSeq: 1,
}));

const initialLists: TaskList[] = [
  {
    id: 'list-1',
    couple_id: 'couple-1',
    name: 'Home',
    icon: '🏡',
    color: '#8B5CF6',
    sort_order: 0,
    created_by: 'user-1',
    created_at: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'list-2',
    couple_id: 'couple-1',
    name: 'Work',
    icon: '💼',
    color: '#0EA5E9',
    sort_order: 1,
    created_by: 'user-1',
    created_at: '2026-03-02T10:00:00.000Z',
  },
];

const initialTasks: Task[] = [
  {
    id: 'task-1',
    category: 'list-1',
    couple_id: 'couple-1',
    title: 'Buy milk',
    notes: null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    assigned_to: null,
    due_date: '2026-03-29',
    priority: 1,
    sort_order: 1,
    created_by: 'user-1',
    created_at: '2026-03-03T10:00:00.000Z',
    updated_at: '2026-03-03T10:00:00.000Z',
  },
  {
    id: 'task-3',
    category: 'list-2',
    couple_id: 'couple-1',
    title: 'Submit receipts',
    notes: null,
    is_completed: true,
    completed_at: '2026-03-05T10:00:00.000Z',
    completed_by: 'user-2',
    assigned_to: null,
    due_date: null,
    priority: 2,
    sort_order: 2,
    created_by: 'user-1',
    created_at: '2026-03-04T10:00:00.000Z',
    updated_at: '2026-03-05T10:00:00.000Z',
  },
  {
    id: 'task-4',
    category: 'list-1',
    couple_id: 'couple-1',
    title: 'Water plants',
    notes: null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    assigned_to: null,
    due_date: null,
    priority: 2,
    sort_order: 3,
    created_by: 'user-1',
    created_at: '2026-03-04T12:00:00.000Z',
    updated_at: '2026-03-04T12:00:00.000Z',
  },
];

function createListResult(payload: Partial<TaskList> & Pick<TaskList, 'name' | 'couple_id' | 'created_by'>): TaskList {
  return {
    id: payload.id ?? `list-generated-${state.nextListSeq++}`,
    couple_id: payload.couple_id,
    name: payload.name,
    icon: payload.icon ?? '📋',
    color: payload.color ?? '#7BA08A',
    sort_order: payload.sort_order ?? 0,
    created_by: payload.created_by,
    created_at: payload.created_at ?? '2026-03-01T00:00:00.000Z',
  };
}

function createTaskResult(
  payload: Partial<Task> & Pick<Task, 'title' | 'couple_id' | 'created_by'>,
): Task {
  const now = '2026-03-06T00:00:00.000Z';
  return {
    id: payload.id ?? `task-generated-${state.nextTaskSeq++}`,
    category: payload.category ?? null,
    couple_id: payload.couple_id,
    title: payload.title,
    notes: payload.notes ?? null,
    is_completed: payload.is_completed ?? false,
    completed_at: payload.completed_at ?? null,
    completed_by: payload.completed_by ?? null,
    assigned_to: payload.assigned_to ?? null,
    due_date: payload.due_date ?? null,
    priority: payload.priority ?? 0,
    sort_order: payload.sort_order ?? 0,
    created_by: payload.created_by,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
  };
}

function cloneTasks(tasks: Task[]) {
  return tasks.map((task) => ({ ...task }));
}

function cloneLists(lists: TaskList[]) {
  return lists.map((list) => ({ ...list }));
}

function getListRows() {
  return state.lists
    .filter((list) => list.couple_id === state.coupleId)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((list) => ({ ...list }));
}

function getTaskRows() {
  return state.tasks
    .filter((task) => task.couple_id === state.coupleId)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((task) => ({ ...task }));
}

function upsertTaskRow(row: Task) {
  const index = state.tasks.findIndex((task) => task.id === row.id);
  if (index === -1) {
    state.tasks = [...state.tasks, createTaskResult(row)];
    return;
  }

  const next = [...state.tasks];
  next[index] = createTaskResult(row);
  state.tasks = next;
}

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => ({
    user: state.authUserId ? { id: state.authUserId } : null,
    profile: state.authUserId ? { _id: state.authUserId, id: state.authUserId } : null,
    activeCouple: state.coupleId
      ? {
          couple: {
            id: state.coupleId,
            _id: state.coupleId,
          },
        }
      : null,
  }),
}));


const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('buildTaskFeed', () => {
  beforeEach(() => {
    state.authUserId = 'user-1';
    state.coupleId = 'couple-1';
    state.lists = cloneLists(initialLists);
    state.tasks = cloneTasks(initialTasks);
    state.taskRealtime = {};
    state.nextTaskSeq = 1;
    state.nextListSeq = 1;
  });

  it('returns active tasks sorted predictably (incomplete first, then by due date and priority)', () => {
    const feed = buildTaskFeed(state.tasks, 'active');

    expect(feed.map((t) => t.id)).toEqual(['task-1', 'task-4']);
    expect(feed.every((t) => !t.is_completed)).toBe(true);
  });

  it('filters completed tasks into the done feed', () => {
    const feed = buildTaskFeed(state.tasks, 'done');

    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe('task-3');
    expect(feed[0].category).toBe('list-2');
  });

  it('returns every task when no filter is applied', () => {
    const feed = buildTaskFeed(state.tasks, 'all');

    expect(feed.map((task) => task.id)).toEqual(['task-1', 'task-4', 'task-3']);
  });

  it('returns task-first empty state guidance when there are no lists or no matching tasks', () => {
    expect(buildTaskFeedViewState([], 'all').emptyState).toEqual({
      title: 'No tasks yet',
      description: 'Add your first task to get started.',
      actionLabel: 'Add Task',
    });

    expect(buildTaskFeedViewState([], 'done').emptyState).toEqual({
      title: 'No completed tasks',
      description: 'Completed tasks will appear here once you finish them.',
      actionLabel: 'Add Task',
    });
  });
});

describe('TasksScreen', () => {
  beforeEach(() => {
    state.authUserId = 'user-1';
    state.coupleId = 'couple-1';
    state.lists = cloneLists(initialLists);
    state.tasks = cloneTasks(initialTasks);
    state.taskRealtime = {};
    state.nextTaskSeq = 1;
    state.nextListSeq = 1;
    bottomSheetSpies.present.mockReset();
    bottomSheetSpies.dismiss.mockReset();
    vi.restoreAllMocks();
  });

  function mockTasksHook(lists: TaskList[], tasks: Task[]) {
    const getTaskFeed = vi.fn((filter: 'all' | 'active' | 'done' = 'all') => buildTaskFeed(tasks, filter));

    vi.spyOn(tasksHooks, 'useTasks').mockReturnValue({
      lists,
      allTasks: tasks,
      taskFeed: buildTaskFeed(tasks, 'all'),
      getTaskFeed,
      isLoading: false,
      getListCounts: vi.fn(),
      createList: vi.fn(),
      deleteList: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      refetch: vi.fn(),
    } as any);

    return { getTaskFeed };
  }

  it('renders task rows with list metadata, filters task state, and opens the task composer from add', async () => {
    mockTasksHook(cloneLists(initialLists), cloneTasks(initialTasks));

    const { default: TasksScreen } = await import('@/app/(tabs)/tasks');
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(<TasksScreen />);
      await flush();
    });

    const readText = () =>
      renderer.root
        .findAll((node: any) => typeof node.children?.[0] === 'string')
        .map((node: any) => node.children.join(''));

    expect(readText()).toContain('Buy milk');
    expect(readText()).toContain('Submit receipts');
    expect(readText()).toContain('Water plants');
    expect(readText()).toContain('list-1');
    expect(readText()).toContain('list-2');

    const pressTab = async (label: string) => {
      const tab = renderer.root.findAll(
        (node: any) => node.props?.onPress && node.findAll?.((child: any) => child.children?.includes?.(label)).length,
      )[0];

      await act(async () => {
        tab.props.onPress();
        await flush();
      });
    };

    await pressTab('Active');
    expect(readText()).toContain('Buy milk');
    expect(readText()).toContain('Water plants');
    expect(readText()).not.toContain('Submit receipts');

    await pressTab('Done');
    expect(readText()).toContain('Submit receipts');
    expect(readText()).not.toContain('Buy milk');

    const addButton = renderer.root.findAll(
      (node: any) => {
        if (!node.props?.onPress) return false;
        const style = node.props.style;
        if (!style) return false;
        const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
        return flat.borderRadius === 26 && flat.width === 52 && flat.height === 52;
      },
    )[0];

    await act(async () => {
      addButton.props.onPress();
      await flush();
    });

    expect(bottomSheetSpies.present).toHaveBeenCalled();

    act(() => {
      renderer.unmount();
    });
  });

  it('shows the task-first empty state when there are no lists', async () => {
    mockTasksHook([], []);

    const { default: TasksScreen } = await import('@/app/(tabs)/tasks');
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(<TasksScreen />);
      await flush();
    });

    const readText = () =>
      renderer.root
        .findAll((node: any) => typeof node.children?.[0] === 'string')
        .map((node: any) => node.children.join(''));

    expect(readText()).toContain('No tasks yet');

    act(() => {
      renderer.unmount();
    });
  });
});

describe('task composer selection contract', () => {
  beforeEach(() => {
    state.lists = cloneLists(initialLists);
    vi.restoreAllMocks();
  });

  it('blocks save until a list is selected', () => {
    expect(
      getTaskComposerSaveError({
        title: 'Draft task',
        selectedListId: null,
      }),
    ).toBe('List required');

    expect(
      getTaskComposerSaveError({
        title: 'Draft task',
        selectedListId: 'list-1',
      }),
    ).toBeNull();
  });

  it('preserves the current list in create flows and the task list in edit flows', () => {
    const createState = buildTaskComposerState({
      lists: state.lists,
      selectedListId: 'list-1',
    });

    expect(createState.selectedListId).toBe('list-1');
    expect(createState.selectedList?.name).toBe('Home');
    expect(createState.dueDate).toBeInstanceOf(Date);

    const editState = buildTaskComposerState({
      task: initialTasks[1],
      lists: state.lists,
      selectedListId: 'list-1',
    });

    expect(editState.selectedListId).toBe('list-2');
    expect(editState.selectedList?.name).toBe('Work');
    expect(editState.title).toBe('Submit receipts');
  });

  it('keeps in-progress edits when only the lists array identity changes', async () => {
    const sheetRef = { current: { dismiss: vi.fn() } } as any;
    const onSave = vi.fn(async () => undefined);
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(
        <CreateTaskSheet sheetRef={sheetRef} onSave={onSave} lists={state.lists} selectedListId="list-1" />,
      );
      await flush();
    });

    const findTitleInput = () =>
      renderer.root.findAll((node: any) => node.type === 'input' && node.props.placeholder === 'What needs doing?')[0];

    await act(async () => {
      findTitleInput().props.onChangeText('Draft from list');
      await flush();
    });

    expect(findTitleInput().props.value).toBe('Draft from list');

    await act(async () => {
      renderer.update(
        <CreateTaskSheet
          sheetRef={sheetRef}
          onSave={onSave}
          lists={cloneLists(state.lists)}
          selectedListId="list-1"
        />,
      );
      await flush();
    });

    expect(findTitleInput().props.value).toBe('Draft from list');

    act(() => {
      renderer.unmount();
    });
  });

  it('submits the selected list id on create flows', async () => {
    const sheetRef = { current: { dismiss: vi.fn() } } as any;
    const onSave = vi.fn(async () => undefined);
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(
        <CreateTaskSheet sheetRef={sheetRef} onSave={onSave} lists={state.lists} selectedListId="list-1" />,
      );
      await flush();
    });

    const titleInput = renderer.root.findAll(
      (node: any) => node.type === 'input' && node.props.placeholder === 'What needs doing?',
    )[0];
    const saveButton = renderer.root.findAll(
      (node: any) => typeof node.props?.onPress === 'function' && node.findAll?.((child: any) => child.children?.includes?.('Add Task')).length,
    )[0];

    await act(async () => {
      titleInput.props.onChangeText('Draft from detail');
      await flush();
    });

    await act(async () => {
      await saveButton.props.onPress();
      await flush();
    });

    expect(onSave).toHaveBeenCalledWith({
      title: 'Draft from detail',
      notes: null,
      due_date: new Date().toISOString().slice(0, 10),
      priority: 0,
      assigned_to: null,
      category: 'list-1',
    });

    act(() => {
      renderer.unmount();
    });
  });

  it('recovers cleanly when save fails', async () => {
    const sheetRef = { current: { dismiss: vi.fn() } } as any;
    const onSave = vi.fn(async () => {
      throw new Error('boom');
    });
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(
        <CreateTaskSheet sheetRef={sheetRef} onSave={onSave} lists={state.lists} selectedListId="list-1" />,
      );
      await flush();
    });

    const titleInput = renderer.root.findAll(
      (node: any) => node.type === 'input' && node.props.placeholder === 'What needs doing?',
    )[0];
    const findSaveButton = () =>
      renderer.root.findAll(
        (node: any) => typeof node.props?.onPress === 'function' && node.findAll?.((child: any) => child.children?.includes?.('Add Task')).length,
      )[0];

    await act(async () => {
      titleInput.props.onChangeText('Should fail');
      await flush();
    });

    await act(async () => {
      await findSaveButton().props.onPress();
      await flush();
    });

    expect(sheetRef.current.dismiss).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(warnSpy).toHaveBeenCalled();
    expect(findSaveButton().props.disabled).toBe(false);

    act(() => {
      renderer.unmount();
    });
  });

  it('preserves category and propagates failures in the list-detail save path', async () => {
    const data = {
      title: 'Draft from detail',
      notes: null,
      due_date: null,
      priority: 0,
      assigned_to: null,
      category: 'list-1',
    };
    const create = vi.fn(async () => {
      throw new Error('persist failed');
    });
    const update = vi.fn(async () => undefined);

    await expect(
      saveTaskFromListDetail({
        data,
        create,
        update,
      }),
    ).rejects.toThrow('persist failed');

    expect(create).toHaveBeenCalledWith(data);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('create list sheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the sheet open and shows an error when list creation fails', async () => {
    const sheetRef = { current: { dismiss: vi.fn() } } as any;
    const onSave = vi.fn(async () => {
      throw new Error('list failed');
    });
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(<CreateListSheet sheetRef={sheetRef} onSave={onSave} />);
      await flush();
    });

    const nameInput = renderer.root.findAll(
      (node: any) => node.type === 'input' && node.props.placeholder === 'List name',
    )[0];
    const saveButton = () =>
      renderer.root.findAll(
        (node: any) => typeof node.props?.onPress === 'function' && node.findAll?.((child: any) => child.children?.includes?.('Create List')).length,
      )[0];

    await act(async () => {
      nameInput.props.onChangeText('Errands');
      await flush();
    });

    await act(async () => {
      await saveButton().props.onPress();
      await flush();
    });

    expect(onSave).toHaveBeenCalledWith({
      name: 'Errands',
      icon: 'shopping-cart',
      color: '#7BA08A',
    });
    expect(sheetRef.current.dismiss).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Create failed', 'Try again.');
    expect(warnSpy).toHaveBeenCalled();
    expect(nameInput.props.value).toBe('Errands');
    expect(saveButton().props.disabled).toBe(false);

    act(() => {
      renderer.unmount();
    });
  });
});

describe('useTasks reconciliation', () => {
  let renderer: any = null;
  let api: ReturnType<typeof useTasks> | null = null;

  function Probe() {
    api = useTasks();
    return null;
  }

  beforeEach(() => {
    state.authUserId = 'user-1';
    state.coupleId = 'couple-1';
    state.lists = cloneLists(initialLists);
    state.tasks = cloneTasks(initialTasks);
    state.taskRealtime = {};
    state.nextTaskSeq = 1;
    state.nextListSeq = 1;
    api = null;
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
    }
    renderer = null;
  });

  async function mountHook() {
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
      await flush();
    });
  }

  // Requires InstantDB's optimistic update system — db.useQuery() must reactively
  // reflect transacted data. Skipped until an InstantDB test mock is available.
  it.skip('keeps one row when create resolves and realtime delivers the same task', async () => {
    await mountHook();
    expect(api).not.toBeNull();

    await act(async () => {
      await api!.createTask({ title: 'Take out trash', category: 'list-1' });
      await flush();
    });

    expect(api!.allTasks.filter((task) => task.title === 'Take out trash')).toHaveLength(1);
    const created = state.tasks.find((task) => task.title === 'Take out trash');
    expect(created).toBeDefined();

    await act(async () => {
      state.taskRealtime.onInsert?.(created as Task);
      await flush();
    });

    expect(api!.allTasks.filter((task) => task.title === 'Take out trash')).toHaveLength(1);
    expect(api!.taskFeed.filter((task) => task.title === 'Take out trash')).toHaveLength(1);
  });

  it.skip('moves a task across lists without duplicating it', async () => {
    await mountHook();
    expect(api).not.toBeNull();

    await act(async () => {
      await api!.updateTask('task-1', { category: 'list-2' });
      await flush();
    });

    expect(api!.allTasks.filter((task) => task.id === 'task-1')).toHaveLength(1);
    expect(api!.allTasks.find((task) => task.id === 'task-1')?.category).toBe('list-2');

    const moved = state.tasks.find((task) => task.id === 'task-1');
    expect(moved).toBeDefined();

    await act(async () => {
      state.taskRealtime.onUpdate?.(moved as Task);
      await flush();
    });

    expect(api!.allTasks.filter((task) => task.id === 'task-1')).toHaveLength(1);
    expect(api!.allTasks.find((task) => task.id === 'task-1')?.category).toBe('list-2');
  });
});

describe('task list detail screen integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces create failure without losing the entered task or list id', async () => {
    const create = vi.fn(async () => {
      throw new Error('persist failed');
    });
    const update = vi.fn(async () => undefined);
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(tasksHooks, 'useTasks').mockReturnValue({
      lists: cloneLists(initialLists),
      allTasks: cloneTasks(initialTasks),
      taskFeed: [],
      getTaskFeed: vi.fn(),
      isLoading: false,
      getListCounts: vi.fn(),
      createList: vi.fn(),
      deleteList: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      refetch: vi.fn(),
    } as any);
    vi.spyOn(tasksHooks, 'useTaskItems').mockReturnValue({
      tasks: cloneTasks(initialTasks),
      isLoading: false,
      counts: { total: initialTasks.length, completed: 1 },
      create,
      update,
      remove: vi.fn(),
      toggleComplete: vi.fn(),
    } as any);

    const { default: TaskListDetailScreen } = await import('@/app/(tabs)/tasks/[listId]');
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(<TaskListDetailScreen />);
      await flush();
    });

    const listLabels = renderer.root.findAll((node: any) => typeof node.children?.[0] === 'string');
    const renderedText = listLabels.map((node: any) => node.children.join(''));

    const titleInput = renderer.root.findAll(
      (node: any) => node.type === 'input' && node.props.placeholder === 'What needs doing?',
    )[0];
    const saveButton = renderer.root.findAll(
      (node: any) => typeof node.props?.onPress === 'function' && node.findAll?.((child: any) => child.children?.includes?.('Add Task')).length,
    )[0];

    expect(renderedText).toContain('Home');
    expect(renderedText).toContain('Work');

    await act(async () => {
      titleInput.props.onChangeText('Detail create failure');
      await flush();
    });

    await act(async () => {
      await saveButton.props.onPress();
      await flush();
    });

    expect(create).toHaveBeenCalledWith({
      title: 'Detail create failure',
      notes: null,
      due_date: new Date().toISOString().slice(0, 10),
      priority: 0,
      assigned_to: null,
      category: 'list-1',
    });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(warnSpy).toHaveBeenCalled();
    expect(titleInput.props.value).toBe('Detail create failure');

    act(() => {
      renderer.unmount();
    });
  });

  it('keeps edit mode active when update fails', async () => {
    const create = vi.fn(async () => undefined);
    const update = vi.fn(async () => {
      throw new Error('persist failed');
    });
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(tasksHooks, 'useTasks').mockReturnValue({
      lists: cloneLists(initialLists),
      allTasks: cloneTasks(initialTasks),
      taskFeed: [],
      getTaskFeed: vi.fn(),
      isLoading: false,
      getListCounts: vi.fn(),
      createList: vi.fn(),
      deleteList: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      refetch: vi.fn(),
    } as any);
    vi.spyOn(tasksHooks, 'useTaskItems').mockReturnValue({
      tasks: cloneTasks(initialTasks),
      isLoading: false,
      counts: { total: initialTasks.length, completed: 1 },
      create,
      update,
      remove: vi.fn(),
      toggleComplete: vi.fn(),
    } as any);

    const { default: TaskListDetailScreen } = await import('@/app/(tabs)/tasks/[listId]');
    let renderer: any = null;

    await act(async () => {
      renderer = TestRenderer.create(<TaskListDetailScreen />);
      await flush();
    });

    const taskRows = renderer.root.findAll((node: any) => typeof node.props?.onLongPress === 'function');
    const titleInput = () =>
      renderer.root.findAll((node: any) => node.type === 'input' && node.props.placeholder === 'What needs doing?')[0];
    const saveButton = () =>
      renderer.root.findAll(
        (node: any) => typeof node.props?.onPress === 'function' && node.findAll?.((child: any) => child.children?.includes?.('Update Task')).length,
      )[0];

    await act(async () => {
      taskRows[0].props.onLongPress();
      await flush();
    });

    await act(async () => {
      titleInput().props.onChangeText('Edited but failing');
      await flush();
    });

    await act(async () => {
      await saveButton().props.onPress();
      await flush();
    });

    expect(update).toHaveBeenCalledWith('task-1', {
      title: 'Edited but failing',
      notes: null,
      due_date: '2026-03-29',
      priority: 1,
      assigned_to: null,
      category: 'list-1',
    });
    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'Try again.');
    expect(warnSpy).toHaveBeenCalled();
    expect(titleInput().props.value).toBe('Edited but failing');

    act(() => {
      renderer.unmount();
    });
  });
});
