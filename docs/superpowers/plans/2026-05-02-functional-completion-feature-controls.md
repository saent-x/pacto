# Functional Completion + Feature Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every visible Pacto feature functional, remove mock/static personalized data, and add account-type feature selection in onboarding plus Profile feature toggles.

**Architecture:** Add a central feature registry and space-level `enabledFeatures` storage, then route all navigation, hub cards, add buttons, summaries, and sheets through that registry. Preserve all existing InstantDB data when features are disabled. Replace static/demo UI with live-derived data or honest empty states.

**Tech Stack:** Expo Router, React Native, InstantDB, Vitest, react-test-renderer, existing `pacto` UI primitives, PNG-backed `Icon` assets.

---

## File Structure

- Create `src/lib/features/registry.ts`: canonical feature IDs, metadata, defaults, sanitizers, helpers.
- Create `src/components/features/FeatureUnavailable.tsx`: reusable unavailable state for disabled direct routes.
- Create `src/hooks/useFeatureGate.ts`: session-aware feature gate helpers for screens and sheets.
- Create `src/test/features-registry.test.ts`: pure registry/default coverage.
- Create `src/test/session-features.test.tsx`: session normalization coverage.
- Create `src/test/feature-gating.test.tsx`: disabled tabs/cards/sheets behavior coverage.
- Modify `instant.schema.ts`: optional `spaces.enabledFeatures`.
- Modify `src/lib/session.tsx`: read and expose sanitized enabled features.
- Modify `src/hooks/useSession.ts`: pass feature state to hook consumers.
- Modify `src/lib/space-actions.ts`: create/update spaces with feature IDs.
- Modify `app/(auth)/onboarding.tsx`: add feature checklist after mode selection.
- Modify `app/sheets/profile.tsx`: add Features section and persist toggles.
- Modify `app/(tabs)/_layout.tsx`: hide disabled tab triggers.
- Modify `app/(tabs)/us/index.tsx`: filter modules and replace any static personalized sections.
- Modify `app/(tabs)/home/index.tsx`: remove mock arc/heatmap/today/coming-up data.
- Modify `src/hooks/useHomeTimeline.ts` and `src/lib/home/builders.ts`: support enabled feature filtering and live home cards.
- Modify `src/lib/calendar/context.tsx`: omit disabled feature types from calendar agenda.
- Modify feature sheets under `app/sheets/`: block direct creation when disabled.
- Modify `app/(tabs)/tasks/[listId].tsx`: add functional sticky quick-add.
- Modify `app/(tabs)/us/timetables/[id].tsx`: remove duplicate floating add UI.
- Modify `src/hooks/useWishlists.ts`, `app/sheets/new-wish.tsx`, and `app/(tabs)/us/wishlists.tsx`: persist Mine/Partner/Shared wish scope and make filters functional.
- Modify `instant.schema.ts`, `src/hooks/useCheckIns.ts`, `app/sheets/new-checkin.tsx`: add energy capture.
- Modify tests under `src/test/` for affected screens/sheets.
- Asset note: current required feature icons all exist in `assets/images/icons`. Do not generate new image assets for this pass unless a chosen UI metaphor cannot be represented by the existing `IconName` set; the planned registry uses existing icons only.

---

### Task 1: Feature Registry

**Files:**
- Create: `src/lib/features/registry.ts`
- Test: `src/test/features-registry.test.ts`

- [ ] **Step 1: Write failing registry tests**

Create `src/test/features-registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ALL_FEATURE_IDS,
  FEATURE_REGISTRY,
  defaultFeaturesForMode,
  sanitizeFeatureIds,
  isKnownFeatureId,
} from '@/src/lib/features/registry';

describe('feature registry', () => {
  it('has unique feature ids and registry entries for every id', () => {
    expect(new Set(ALL_FEATURE_IDS).size).toBe(ALL_FEATURE_IDS.length);
    for (const id of ALL_FEATURE_IDS) {
      expect(FEATURE_REGISTRY[id].id).toBe(id);
      expect(FEATURE_REGISTRY[id].label.length).toBeGreaterThan(0);
      expect(FEATURE_REGISTRY[id].icon.length).toBeGreaterThan(0);
    }
  });

  it('returns account-type defaults with home always enabled', () => {
    expect(defaultFeaturesForMode('solo')).toContain('home');
    expect(defaultFeaturesForMode('pair')).toContain('home');
    expect(defaultFeaturesForMode('crew')).toContain('home');
    expect(defaultFeaturesForMode('solo')).toContain('checkins');
    expect(defaultFeaturesForMode('solo')).not.toContain('expenses');
    expect(defaultFeaturesForMode('pair')).toContain('expenses');
    expect(defaultFeaturesForMode('crew')).toContain('timetables');
  });

  it('sanitizes unknown, duplicate, and malformed ids', () => {
    expect(sanitizeFeatureIds(['home', 'tasks', 'tasks', 'bogus', 7])).toEqual([
      'home',
      'tasks',
    ]);
    expect(sanitizeFeatureIds(null)).toEqual([]);
    expect(isKnownFeatureId('tasks')).toBe(true);
    expect(isKnownFeatureId('bogus')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/features-registry.test.ts
```

Expected: FAIL because `src/lib/features/registry.ts` does not exist.

- [ ] **Step 3: Implement registry**

Create `src/lib/features/registry.ts`:

```ts
import type { IconName } from '@/src/components/ui/Icon';
import type { SpaceMode } from '@/src/lib/session';

export const ALL_FEATURE_IDS = [
  'home',
  'calendar',
  'reminders',
  'tasks',
  'notes',
  'checkins',
  'expenses',
  'wishlists',
  'milestones',
  'plans',
  'journal',
  'timetables',
  'assistant',
] as const;

export type FeatureId = (typeof ALL_FEATURE_IDS)[number];
export type FeatureGroup = 'core' | 'shared' | 'memory' | 'money' | 'planning' | 'ai';

export type FeatureDefinition = {
  id: FeatureId;
  label: string;
  description: string;
  icon: IconName;
  accentKey: 'accent' | 'accent2' | 'accent3' | 'rose' | 'lavender' | 'mint' | 'sky' | 'gold' | 'peach' | 'butter';
  group: FeatureGroup;
  routes: string[];
  sheetRoutes: string[];
  defaults: Record<SpaceMode, boolean>;
};

export const FEATURE_REGISTRY: Record<FeatureId, FeatureDefinition> = {
  home: { id: 'home', label: 'Home', description: 'Daily summary and shortcuts', icon: 'home', accentKey: 'gold', group: 'core', routes: ['/(tabs)/home'], sheetRoutes: [], defaults: { solo: true, pair: true, crew: true } },
  calendar: { id: 'calendar', label: 'Calendar', description: 'Agenda from dated plans, tasks, reminders, and milestones', icon: 'calendar', accentKey: 'sky', group: 'core', routes: ['/(tabs)/calendar'], sheetRoutes: [], defaults: { solo: true, pair: true, crew: true } },
  reminders: { id: 'reminders', label: 'Reminders', description: 'Due reminders and recurring nudges', icon: 'bell', accentKey: 'lavender', group: 'core', routes: ['/(tabs)/reminders'], sheetRoutes: ['/sheets/new-reminder'], defaults: { solo: true, pair: true, crew: true } },
  tasks: { id: 'tasks', label: 'Tasks', description: 'Task lists and quick add', icon: 'checkSquare', accentKey: 'mint', group: 'core', routes: ['/(tabs)/tasks'], sheetRoutes: ['/sheets/new-list', '/sheets/new-task'], defaults: { solo: true, pair: true, crew: true } },
  notes: { id: 'notes', label: 'Notes', description: 'Short notes for the pact', icon: 'heart', accentKey: 'rose', group: 'memory', routes: ['/(tabs)/us/notes'], sheetRoutes: ['/sheets/new-note'], defaults: { solo: false, pair: true, crew: true } },
  checkins: { id: 'checkins', label: 'Check-ins', description: 'Mood, energy, and daily context', icon: 'feather', accentKey: 'butter', group: 'shared', routes: ['/(tabs)/us/checkins'], sheetRoutes: ['/sheets/new-checkin'], defaults: { solo: true, pair: true, crew: false } },
  expenses: { id: 'expenses', label: 'Expenses', description: 'Shared spending and settlement', icon: 'creditCard', accentKey: 'rose', group: 'money', routes: ['/(tabs)/us/expenses'], sheetRoutes: ['/sheets/new-expense', '/sheets/currency'], defaults: { solo: false, pair: true, crew: true } },
  wishlists: { id: 'wishlists', label: 'Wishlists', description: 'Mine, theirs, and shared wishes', icon: 'gift', accentKey: 'lavender', group: 'shared', routes: ['/(tabs)/us/wishlists'], sheetRoutes: ['/sheets/new-wish'], defaults: { solo: true, pair: true, crew: true } },
  milestones: { id: 'milestones', label: 'Milestones', description: 'Dates worth remembering', icon: 'flag', accentKey: 'peach', group: 'memory', routes: ['/(tabs)/us/milestones'], sheetRoutes: ['/sheets/new-milestone'], defaults: { solo: true, pair: true, crew: true } },
  plans: { id: 'plans', label: 'Plans', description: 'Longer-term plans and targets', icon: 'compass', accentKey: 'mint', group: 'planning', routes: ['/(tabs)/us/plans'], sheetRoutes: ['/sheets/new-plan'], defaults: { solo: true, pair: true, crew: true } },
  journal: { id: 'journal', label: 'Journal', description: 'Private and shared journal entries', icon: 'book', accentKey: 'peach', group: 'memory', routes: ['/(tabs)/us/journal'], sheetRoutes: ['/sheets/new-entry', '/sheets/journal-entry'], defaults: { solo: true, pair: true, crew: false } },
  timetables: { id: 'timetables', label: 'Timetables', description: 'Weekly rhythms and routines', icon: 'grid', accentKey: 'sky', group: 'planning', routes: ['/(tabs)/us/timetables'], sheetRoutes: ['/sheets/new-timetable', '/sheets/new-timetable-item'], defaults: { solo: false, pair: true, crew: true } },
  assistant: { id: 'assistant', label: 'Assistant', description: 'Voice and AI assistance', icon: 'sparkle', accentKey: 'gold', group: 'ai', routes: [], sheetRoutes: [], defaults: { solo: true, pair: true, crew: true } },
};

const KNOWN = new Set<string>(ALL_FEATURE_IDS);

export function isKnownFeatureId(value: unknown): value is FeatureId {
  return typeof value === 'string' && KNOWN.has(value);
}

export function sanitizeFeatureIds(value: unknown): FeatureId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<FeatureId>();
  for (const item of value) {
    if (isKnownFeatureId(item)) seen.add(item);
  }
  return ALL_FEATURE_IDS.filter((id) => seen.has(id));
}

export function defaultFeaturesForMode(mode: SpaceMode): FeatureId[] {
  return ALL_FEATURE_IDS.filter((id) => FEATURE_REGISTRY[id].defaults[mode]);
}

export function resolveEnabledFeatures(value: unknown, mode: SpaceMode): FeatureId[] {
  const sanitized = sanitizeFeatureIds(value);
  return sanitized.length > 0 ? sanitized : defaultFeaturesForMode(mode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test src/test/features-registry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/features/registry.ts src/test/features-registry.test.ts
git commit -m "feat: add feature registry"
```

### Task 2: Schema, Session, And Space Actions

**Files:**
- Modify: `instant.schema.ts`
- Modify: `src/lib/session.tsx`
- Modify: `src/hooks/useSession.ts`
- Modify: `src/lib/space-actions.ts`
- Test: `src/test/session-features.test.tsx`

- [ ] **Step 1: Write failing session tests**

Create `src/test/session-features.test.tsx` with direct pure helper coverage by exporting `normalizeMode` and a new `buildSessionFeatureState` helper from `src/lib/session.tsx`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSessionFeatureState } from '@/src/lib/session';

describe('session feature state', () => {
  it('uses defaults when space has no enabledFeatures', () => {
    const state = buildSessionFeatureState(undefined, 'pair');
    expect(state.enabledFeatures).toContain('notes');
    expect(state.enabledFeatures).toContain('expenses');
    expect(state.isFeatureEnabled('home')).toBe(true);
  });

  it('uses sanitized stored feature ids when present', () => {
    const state = buildSessionFeatureState(['home', 'tasks', 'bogus', 'tasks'], 'pair');
    expect(state.enabledFeatures).toEqual(['home', 'tasks']);
    expect(state.isFeatureEnabled('tasks')).toBe(true);
    expect(state.isFeatureEnabled('expenses')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/session-features.test.tsx
```

Expected: FAIL because `buildSessionFeatureState` does not exist.

- [ ] **Step 3: Add schema field**

In `instant.schema.ts`, update `spaces`:

```ts
spaces: i.entity({
  kind: i.string(),
  name: i.string().optional(),
  anniversary: i.string().optional(),
  inviteCode: i.string().optional().unique().indexed(),
  enabledFeatures: i.json().optional(),
  createdAt: i.number(),
  updatedAt: i.number(),
}),
```

- [ ] **Step 4: Extend session types and helper**

In `src/lib/session.tsx`, import registry types and add to `SessionSpace` and `Session`:

```ts
import {
  resolveEnabledFeatures,
  type FeatureId,
} from '@/src/lib/features/registry';
```

```ts
export type SessionSpace = {
  id: string;
  kind: SpaceMode;
  kindRaw?: SpaceKindWire;
  name?: string | null;
  anniversary?: string | null;
  inviteCode?: string | null;
  enabledFeatures: FeatureId[];
};

export type Session = {
  // existing fields
  enabledFeatures: FeatureId[];
  isFeatureEnabled: (id: FeatureId) => boolean;
};

export function buildSessionFeatureState(raw: unknown, mode: SpaceMode) {
  const enabledFeatures = resolveEnabledFeatures(raw, mode);
  const enabled = new Set(enabledFeatures);
  return {
    enabledFeatures,
    isFeatureEnabled: (id: FeatureId) => enabled.has(id),
  };
}
```

Inside the ready session branch:

```ts
const features = buildSessionFeatureState(space.enabledFeatures, mode);

return {
  status: 'ready',
  user: authUserToSessionUser(user),
  space: {
    id: space.id,
    kind: mode,
    kindRaw,
    name: space.name ?? null,
    anniversary: space.anniversary ?? null,
    inviteCode: space.inviteCode ?? null,
    enabledFeatures: features.enabledFeatures,
  },
  membership: {
    id: myMembership.id,
    role: myMembership.role as 'owner' | 'partner',
    lastNotificationsReadAt: (myMembership as any).lastNotificationsReadAt ?? null,
  },
  partner,
  members,
  mode,
  isSolo: mode === 'solo',
  isPair: mode === 'pair',
  isCrew: mode === 'crew',
  isCouple: mode === 'pair',
  enabledFeatures: features.enabledFeatures,
  isFeatureEnabled: features.isFeatureEnabled,
};
```

Update `emptySession`:

```ts
enabledFeatures: [],
isFeatureEnabled: () => false,
```

- [ ] **Step 5: Extend hook adapter**

In `src/hooks/useSession.ts`, import `FeatureId` and expose:

```ts
enabledFeatures: ReturnType<typeof useBaseSession>['enabledFeatures'];
isFeatureEnabled: (id: FeatureId) => boolean;
```

Return:

```ts
enabledFeatures: s.enabledFeatures,
isFeatureEnabled: s.isFeatureEnabled,
```

Also add `enabledFeatures` to `activeCouple.couple` only if a consumer needs it; otherwise keep it on the top-level hook.

- [ ] **Step 6: Update space actions**

In `src/lib/space-actions.ts`, import `FeatureId` and `defaultFeaturesForMode`. Change `createSpace` params:

```ts
enabledFeatures?: FeatureId[];
```

When creating space fields:

```ts
const mode = params.kind === 'solo' ? 'solo' : 'pair';
spaceFields.enabledFeatures = params.enabledFeatures ?? defaultFeaturesForMode(mode);
```

Add:

```ts
export async function updateSpaceFeatures(params: {
  spaceId: string;
  enabledFeatures: FeatureId[];
}): Promise<void> {
  await db.transact([
    tx.spaces[params.spaceId].update({
      enabledFeatures: params.enabledFeatures,
      updatedAt: now(),
    }),
  ]);
}
```

- [ ] **Step 7: Run session tests**

Run:

```bash
pnpm test src/test/session-features.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add instant.schema.ts src/lib/session.tsx src/hooks/useSession.ts src/lib/space-actions.ts src/test/session-features.test.tsx
git commit -m "feat: store enabled features on spaces"
```

### Task 3: Onboarding Feature Selection

**Files:**
- Modify: `app/(auth)/onboarding.tsx`
- Test: `src/test/onboarding-features.test.tsx`

- [ ] **Step 1: Write failing onboarding tests**

Create `src/test/onboarding-features.test.tsx`:

```ts
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerSpy = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('expo-router', () => ({ useRouter: () => routerSpy }));

const sessionState = vi.hoisted(() => ({
  user: { id: 'u1', email: 'a@b.test', avatarUrl: null },
}));
vi.mock('@/src/lib/session', () => ({ useSession: () => sessionState }));

const actions = vi.hoisted(() => ({
  ensureUserRow: vi.fn(async () => undefined),
  createSpace: vi.fn(async () => ({ spaceId: 's1', inviteCode: null })),
}));
vi.mock('@/src/lib/space-actions', () => actions);

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((r) => setTimeout(r, 0));

function find(root: any, id: string) {
  return root.findAll((n: any) => n.props?.testID === id)[0];
}

describe('onboarding feature selection', () => {
  beforeEach(() => {
    routerSpy.push.mockClear();
    actions.createSpace.mockClear();
  });

  it('creates pair space with selected feature ids', async () => {
    const { default: Onboarding } = await import('@/app/(auth)/onboarding');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<Onboarding />);
      await flush();
    });
    await act(async () => {
      find(renderer.root, 'onboarding-mode-pair').props.onPress();
      await flush();
    });
    await act(async () => {
      find(renderer.root, 'feature-toggle-expenses').props.onPress();
      await flush();
    });
    await act(async () => {
      find(renderer.root, 'onboarding-create-space').props.onPress();
      await flush();
    });
    expect(actions.createSpace).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        kind: 'couple',
        enabledFeatures: expect.arrayContaining(['home', 'tasks', 'reminders']),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/onboarding-features.test.tsx
```

Expected: FAIL because onboarding creates immediately on mode card press.

- [ ] **Step 3: Implement two-step onboarding**

In `app/(auth)/onboarding.tsx`:

```ts
import {
  ALL_FEATURE_IDS,
  FEATURE_REGISTRY,
  defaultFeaturesForMode,
  type FeatureId,
} from '@/src/lib/features/registry';
```

Replace immediate `pick(mode)` with state:

```ts
const [mode, setMode] = useState<Mode | null>(null);
const [selectedFeatures, setSelectedFeatures] = useState<FeatureId[]>([]);

function chooseMode(next: Mode) {
  setMode(next);
  const registryMode = next === 'solo' ? 'solo' : next === 'crew' ? 'crew' : 'pair';
  setSelectedFeatures(defaultFeaturesForMode(registryMode));
}

function toggleFeature(id: FeatureId) {
  if (id === 'home') return;
  setSelectedFeatures((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
  );
}
```

Change create handler:

```ts
async function createSelectedSpace() {
  if (!user || !mode) return;
  setBusy(mode);
  setError(null);
  try {
    await ensureUserRow({
      userId: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl ?? randomDefaultAvatarId(),
    });
    const wireKind: 'solo' | 'couple' = mode === 'solo' ? 'solo' : 'couple';
    const result = await createSpace({
      userId: user.id,
      kind: wireKind,
      enabledFeatures: selectedFeatures,
    });
    if (mode !== 'solo' && result.inviteCode) {
      router.push({ pathname: '/(auth)/invite-code', params: { code: result.inviteCode } } as any);
    }
  } catch (e: any) {
    console.warn('[onboarding] failed', e);
    setError(e?.message ?? e?.body?.message ?? 'Could not create space');
  } finally {
    setBusy(null);
  }
}
```

Render feature rows after a mode is selected:

```tsx
{mode ? (
  <View style={styles.features}>
    {ALL_FEATURE_IDS.map((id) => {
      const feature = FEATURE_REGISTRY[id];
      const selected = selectedFeatures.includes(id);
      return (
        <PressScale
          key={id}
          testID={`feature-toggle-${id}`}
          onPress={() => toggleFeature(id)}
          disabled={id === 'home'}
          style={[styles.featureRow, { borderColor: selected ? C.accent : C.lineColor }]}
        >
          <Icon name={feature.icon} size={18} color={selected ? C.accent : C.ink3} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>{feature.label}</Text>
            <Text style={[Typography.caption, { color: C.ink3 }]}>{feature.description}</Text>
          </View>
          <Text style={[Typography.captionMedium, { color: selected ? C.accent : C.ink3 }]}>
            {selected ? 'On' : 'Off'}
          </Text>
        </PressScale>
      );
    })}
    <PressScale testID="onboarding-create-space" onPress={createSelectedSpace} style={styles.continueButton}>
      <Text style={[Typography.bodyMedium, { color: C.bg }]}>
        {busy ? 'Creating...' : 'Continue'}
      </Text>
    </PressScale>
  </View>
) : null}
```

- [ ] **Step 4: Run onboarding test**

Run:

```bash
pnpm test src/test/onboarding-features.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/onboarding.tsx" src/test/onboarding-features.test.tsx
git commit -m "feat: choose features during onboarding"
```

### Task 4: Profile Feature Toggles

**Files:**
- Modify: `app/sheets/profile.tsx`
- Modify: `src/test/sheets/profile.test.tsx`

- [ ] **Step 1: Write failing Profile toggle test**

Append to `src/test/sheets/profile.test.tsx` after aligning session mock with current Profile:

```ts
it('persists feature toggles and keeps home locked on', async () => {
  sessionState.enabledFeatures = ['home', 'tasks', 'reminders', 'expenses'];
  sessionState.isFeatureEnabled = (id: any) => sessionState.enabledFeatures.includes(id);
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<ProfileSheet />);
    await flush();
  });
  expect(findByTestID(renderer.root, 'profile-feature-home-lock')).toBeDefined();
  await act(async () => {
    findByTestID(renderer.root, 'profile-feature-expenses').props.onPress();
    await flush();
  });
  expect(spaceActions.updateSpaceFeatures).toHaveBeenCalledWith({
    spaceId: 's1',
    enabledFeatures: ['home', 'tasks', 'reminders'],
  });
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/sheets/profile.test.tsx
```

Expected: FAIL because Profile has no feature rows and mock lacks `updateSpaceFeatures`.

- [ ] **Step 3: Implement Profile Features section**

In `app/sheets/profile.tsx`, import:

```ts
import { ALL_FEATURE_IDS, FEATURE_REGISTRY, type FeatureId } from '@/src/lib/features/registry';
import { updateSpaceFeatures } from '@/src/lib/space-actions';
```

Add handler:

```ts
async function onToggleFeature(featureId: FeatureId) {
  if (!session.space || featureId === 'home') return;
  const current = session.enabledFeatures;
  const enabledFeatures = current.includes(featureId)
    ? current.filter((id) => id !== featureId)
    : [...current, featureId];
  try {
    Haptics.selectionAsync().catch(() => undefined);
    await updateSpaceFeatures({ spaceId: session.space.id, enabledFeatures });
  } catch (err) {
    console.warn('[profile] feature update failed', err);
    Alert.alert('Feature update failed', 'Try again.');
  }
}
```

Render before Theme card:

```tsx
<Text style={[Typography.eyebrowSm, { color: C.ink3, marginLeft: 4, marginBottom: 10 }]}>
  Features
</Text>
<Card padded={false} style={{ marginBottom: 14 }}>
  {ALL_FEATURE_IDS.map((featureId, index) => {
    const feature = FEATURE_REGISTRY[featureId];
    const selected = session.isFeatureEnabled(featureId);
    const locked = featureId === 'home';
    return (
      <PressScale
        key={featureId}
        testID={locked ? 'profile-feature-home-lock' : `profile-feature-${featureId}`}
        onPress={() => onToggleFeature(featureId)}
        disabled={locked}
        style={[
          styles.row,
          index < ALL_FEATURE_IDS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.lineColor } : null,
        ]}
      >
        <Icon name={feature.icon} size={18} color={selected ? C.accent : C.ink3} />
        <View style={{ flex: 1 }}>
          <Text style={[Typography.body, { color: C.inkColor }]}>{feature.label}</Text>
          <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}>
            {feature.description}
          </Text>
        </View>
        <Text style={[Typography.captionMedium, { color: selected ? C.accent : C.ink3 }]}>
          {locked ? 'Always on' : selected ? 'On' : 'Off'}
        </Text>
      </PressScale>
    );
  })}
</Card>
```

- [ ] **Step 4: Run Profile test**

Run:

```bash
pnpm test src/test/sheets/profile.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/sheets/profile.tsx src/test/sheets/profile.test.tsx
git commit -m "feat: manage features from profile"
```

### Task 5: Feature Gate Utilities And Navigation

**Files:**
- Create: `src/hooks/useFeatureGate.ts`
- Create: `src/components/features/FeatureUnavailable.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/us/index.tsx`
- Test: `src/test/feature-gating.test.tsx`
- Test: `src/test/us-index.test.tsx`

- [ ] **Step 1: Write failing feature gating tests**

Create `src/test/feature-gating.test.tsx`:

```ts
import { describe, expect, it } from 'vitest';
import { routeFeatureForPath } from '@/src/hooks/useFeatureGate';

describe('route feature mapping', () => {
  it('maps routes and sheets to owning features', () => {
    expect(routeFeatureForPath('/(tabs)/tasks')).toBe('tasks');
    expect(routeFeatureForPath('/sheets/new-task')).toBe('tasks');
    expect(routeFeatureForPath('/(tabs)/us/wishlists')).toBe('wishlists');
    expect(routeFeatureForPath('/sheets/new-wish')).toBe('wishlists');
    expect(routeFeatureForPath('/sheets/profile')).toBeNull();
  });
});
```

Append to `src/test/us-index.test.tsx`:

```ts
it('hides disabled modules from the Us hub', async () => {
  sessionState.enabledFeatures = ['home', 'tasks', 'reminders', 'plans'];
  sessionState.isFeatureEnabled = (id: any) => sessionState.enabledFeatures.includes(id);
  const renderer = await render();
  const text = readText(renderer.root).join('');
  expect(text).toContain('Plans');
  expect(text).not.toContain('Expenses');
  expect(text).not.toContain('Wishlists');
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test src/test/feature-gating.test.tsx src/test/us-index.test.tsx
```

Expected: FAIL because `useFeatureGate.ts` does not exist and Us hub does not filter by feature.

- [ ] **Step 3: Implement route mapping and unavailable UI**

Create `src/hooks/useFeatureGate.ts`:

```ts
import { useMemo } from 'react';
import { useSession } from '@/src/hooks/useSession';
import { FEATURE_REGISTRY, type FeatureId } from '@/src/lib/features/registry';

export function routeFeatureForPath(path: string): FeatureId | null {
  for (const feature of Object.values(FEATURE_REGISTRY)) {
    if (feature.routes.some((route) => path.startsWith(route))) return feature.id;
    if (feature.sheetRoutes.some((route) => path.startsWith(route))) return feature.id;
  }
  return null;
}

export function useFeatureGate(featureId: FeatureId) {
  const session = useSession();
  return useMemo(
    () => ({
      enabled: session.isFeatureEnabled(featureId),
      feature: FEATURE_REGISTRY[featureId],
    }),
    [featureId, session.enabledFeatures],
  );
}
```

Create `src/components/features/FeatureUnavailable.tsx`:

```tsx
import { router } from 'expo-router';
import { View } from 'react-native';
import { ActionEmptyState } from '@/src/components/ui/pacto';
import type { FeatureDefinition } from '@/src/lib/features/registry';

export function FeatureUnavailable({ feature }: { feature: FeatureDefinition }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <ActionEmptyState
        icon={feature.icon}
        title={`${feature.label} is turned off`}
        body="Turn it back on from Profile to see previous data and create new items."
        actionLabel="Open profile"
        onAction={() => router.push('/sheets/profile' as any)}
      />
    </View>
  );
}
```

- [ ] **Step 4: Gate tabs**

In `app/(tabs)/_layout.tsx`, read session:

```ts
const { isSolo, isFeatureEnabled } = useSession();
```

Wrap optional tab triggers:

```tsx
{isFeatureEnabled('calendar') ? (
  <NativeTabs.Trigger name="calendar">
    <NativeTabs.Trigger.Label hidden>Calendar</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon src={TAB_ICONS.calendar} renderingMode="template" />
  </NativeTabs.Trigger>
) : null}
```

Repeat for `tasks` and `reminders`. Keep `home` and `us` visible.

- [ ] **Step 5: Filter Us modules**

In `app/(tabs)/us/index.tsx`, destructure:

```ts
const { user, partner, mode, activeCouple, isFeatureEnabled } = useSession();
```

Filter:

```ts
const modules: Module[] = useMemo(
  () =>
    [
      // current module entries
    ].filter((module) => isFeatureEnabled(module.id as any)),
  [isFeatureEnabled, notes.notes?.length, checkIns.checkIns?.length, expenses.expenses?.length, wishlists.wishlists?.length, milestones.milestones?.length, plans.plans?.length, journal.entries?.length],
);
```

- [ ] **Step 6: Run gating tests**

Run:

```bash
pnpm test src/test/feature-gating.test.tsx src/test/us-index.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useFeatureGate.ts src/components/features/FeatureUnavailable.tsx "app/(tabs)/_layout.tsx" "app/(tabs)/us/index.tsx" src/test/feature-gating.test.tsx src/test/us-index.test.tsx
git commit -m "feat: gate navigation by enabled features"
```

### Task 6: Direct Sheet Guards

**Files:**
- Modify: `app/sheets/new-note.tsx`
- Modify: `app/sheets/new-checkin.tsx`
- Modify: `app/sheets/new-expense.tsx`
- Modify: `app/sheets/new-wish.tsx`
- Modify: `app/sheets/new-milestone.tsx`
- Modify: `app/sheets/new-plan.tsx`
- Modify: `app/sheets/new-entry.tsx`
- Modify: `app/sheets/new-timetable.tsx`
- Modify: `app/sheets/new-timetable-item.tsx`
- Modify: `app/sheets/new-task.tsx`
- Modify: `app/sheets/new-list.tsx`
- Test: `src/test/feature-gating.test.tsx`

- [ ] **Step 1: Add failing disabled sheet test**

Append to `src/test/feature-gating.test.tsx`:

```ts
import { FEATURE_REGISTRY } from '@/src/lib/features/registry';

describe('feature registry route ownership', () => {
  it('assigns every creation sheet to exactly one feature', () => {
    const sheets = [
      '/sheets/new-note',
      '/sheets/new-checkin',
      '/sheets/new-expense',
      '/sheets/new-wish',
      '/sheets/new-milestone',
      '/sheets/new-plan',
      '/sheets/new-entry',
      '/sheets/new-timetable',
      '/sheets/new-timetable-item',
      '/sheets/new-task',
      '/sheets/new-list',
    ];
    for (const sheet of sheets) {
      expect(routeFeatureForPath(sheet), sheet).not.toBeNull();
    }
    expect(FEATURE_REGISTRY.home.sheetRoutes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails if any mapping is missing**

Run:

```bash
pnpm test src/test/feature-gating.test.tsx
```

Expected: PASS after Task 5 registry, FAIL for any omitted sheet route.

- [ ] **Step 3: Add per-sheet guard pattern**

At the top of each sheet component:

```tsx
const gate = useFeatureGate('wishlists');
if (!gate.enabled) return <FeatureUnavailable feature={gate.feature} />;
```

Use the owning feature:

- `new-note` -> `notes`
- `new-checkin` -> `checkins`
- `new-expense` -> `expenses`
- `new-wish` -> `wishlists`
- `new-milestone` -> `milestones`
- `new-plan` -> `plans`
- `new-entry` and `journal-entry` -> `journal`
- `new-timetable` and `new-timetable-item` -> `timetables`
- `new-task` and `new-list` -> `tasks`
- `currency` -> `expenses`

- [ ] **Step 4: Run sheet tests**

Run:

```bash
pnpm test src/test/sheets/new-wish.test.tsx src/test/sheets/new-checkin.test.tsx src/test/sheets/new-milestone.test.tsx src/test/feature-gating.test.tsx
```

Expected: PASS after mocks add `enabledFeatures` and `isFeatureEnabled`.

- [ ] **Step 5: Commit**

```bash
git add app/sheets src/test/feature-gating.test.tsx src/test/sheets
git commit -m "feat: block disabled feature sheets"
```

### Task 7: Home Dynamic Data Cleanup

**Files:**
- Modify: `app/(tabs)/home/index.tsx`
- Modify: `src/hooks/useHomeTimeline.ts`
- Modify: `src/lib/home/builders.ts`
- Test: `src/test/home-screen.test.tsx`
- Test: `src/test/home-today-rings.test.ts`

- [ ] **Step 1: Write failing tests for hardcoded Home strings**

In `src/test/home-screen.test.tsx`, add:

```ts
it('does not render hardcoded demo agenda and weather copy', async () => {
  const renderer = await renderHome();
  const text = renderer.root
    .findAll((n: any) => typeof n.children?.[0] === 'string')
    .flatMap((n: any) => n.children.filter((c: any) => typeof c === 'string'))
    .join(' ');
  expect(text).not.toContain('Brooklyn');
  expect(text).not.toContain('Pay electricity bill');
  expect(text).not.toContain('Sheet-pan salmon');
  expect(text).not.toContain('Picnic at Buttermilk');
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/home-screen.test.tsx
```

Expected: FAIL because current Home renders static agenda/weather/coming-up content.

- [ ] **Step 3: Replace static Home data**

In `app/(tabs)/home/index.tsx`:

- Remove `ARC_MOCK`.
- Remove `TODAY_ROWS`.
- Remove seeded `togetherData`.
- Import and call `useHomeTimeline({ previewDays: 30 })`.
- Build `todayRows` from `home.timeline.slice(0, 3)`.
- Render `ActionEmptyState` when no timeline rows exist.
- Render Coming Up from first plan or milestone in `home.timeline`.
- Remove weather banner entirely because there is no weather data source in the app.

Core replacement:

```ts
const home = useHomeTimeline({ previewDays: 30 });
const todayRows = home.timeline.slice(0, 3);
const coming = home.timeline.find((item) => item.type === 'plan' || item.type === 'event' || item.type === 'milestone') ?? null;
```

Render rows:

```tsx
{todayRows.length === 0 ? (
  <ActionEmptyState
    icon="calendar"
    title="Nothing dated today"
    body="Add a task, reminder, or plan with a date to see it here."
    actionLabel="Add plan"
    onAction={() => router.push('/sheets/new-plan' as any)}
  />
) : (
  todayRows.map((row) => (
    <PressScale key={row.id} onPress={() => router.push(routeForTimelineItem(row) as any)} style={styles.todayRow2}>
      <Text style={[Typography.mono, styles.todayTime, { color: C.ink3 }]}>
        {row.occursAt ? format(new Date(row.occursAt), 'h:mma').toLowerCase() : 'day'}
      </Text>
      <View style={[styles.todayDot, { backgroundColor: colorForTimelineType(row.type, C) }]} />
      <View style={{ flex: 1 }}>
        <Text style={[Typography.bodyMedium, { color: C.inkColor }]} numberOfLines={1}>{row.title}</Text>
        <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>{row.subtitle ?? row.type}</Text>
      </View>
      <Icon name="chevronRight" size={16} color={C.ink3} />
    </PressScale>
  ))
)}
```

- [ ] **Step 4: Filter Home by enabled features**

In `src/hooks/useHomeTimeline.ts`, read `enabledFeatures` and exclude disabled source arrays before calling builders:

```ts
const { activeCouple, profile, isFeatureEnabled } = useSession();
const reminders = isFeatureEnabled('reminders') ? data?.reminders ?? [] : [];
const tasks = isFeatureEnabled('tasks') ? data?.tasks ?? [] : [];
const plans = isFeatureEnabled('plans') ? data?.plans ?? [] : [];
const memories = buildMemoryPreviews({
  journalEntries: isFeatureEnabled('journal') ? data?.journalEntries ?? [] : [],
  loveNotes: isFeatureEnabled('notes') ? data?.loveNotes ?? [] : [],
});
```

- [ ] **Step 5: Run Home tests**

Run:

```bash
pnpm test src/test/home-screen.test.tsx src/test/home-today-rings.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/home/index.tsx" src/hooks/useHomeTimeline.ts src/lib/home/builders.ts src/test/home-screen.test.tsx src/test/home-today-rings.test.ts
git commit -m "fix: replace home demo data with live summaries"
```

### Task 8: Calendar Feature Filtering

**Files:**
- Modify: `src/lib/calendar/context.tsx`
- Test: `src/test/calendar-event-rendering.test.tsx`
- Test: `src/test/calendar-date-navigation.test.tsx`

- [ ] **Step 1: Add failing calendar disabled-feature test**

In `src/test/calendar-event-rendering.test.tsx`, add a session mock case where `tasks` is disabled and assert task titles do not render while reminders still do.

```ts
it('omits disabled feature types from the agenda', async () => {
  sessionState.enabledFeatures = ['home', 'calendar', 'reminders'];
  sessionState.isFeatureEnabled = (id: any) => sessionState.enabledFeatures.includes(id);
  calendarState.agenda = [
    { id: 'task:t1', type: 'task', title: 'Hidden task', sourceId: 't1', sourceTable: 'tasks', subtitle: null, occursAt: Date.now(), priority: 0, isPrivate: false, isOverdue: false },
    { id: 'reminder:r1', type: 'reminder', title: 'Visible reminder', sourceId: 'r1', sourceTable: 'reminders', subtitle: null, occursAt: Date.now(), priority: 0, isPrivate: false, isOverdue: false },
  ];
  const renderer = await renderCalendar();
  const text = readText(renderer.root).join(' ');
  expect(text).not.toContain('Hidden task');
  expect(text).toContain('Visible reminder');
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run calendar tests to verify failure**

Run:

```bash
pnpm test src/test/calendar-event-rendering.test.tsx src/test/calendar-date-navigation.test.tsx
```

Expected: FAIL until context filters arrays by enabled feature.

- [ ] **Step 3: Filter in calendar context**

In `src/lib/calendar/context.tsx`, destructure `isFeatureEnabled`:

```ts
const { activeCouple, isFeatureEnabled } = useSession();
```

Use:

```ts
plans: isFeatureEnabled('plans') ? data?.plans ?? [] : [],
reminders: isFeatureEnabled('reminders') ? data?.reminders ?? [] : [],
tasks: isFeatureEnabled('tasks') ? data?.tasks ?? [] : [],
rituals: [],
```

Keep events and milestones included under calendar/milestones:

```ts
events: data?.events ?? [],
milestones: isFeatureEnabled('milestones') ? data?.milestones ?? [] : [],
```

- [ ] **Step 4: Run calendar tests**

Run:

```bash
pnpm test src/test/calendar-event-rendering.test.tsx src/test/calendar-date-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar/context.tsx src/test/calendar-event-rendering.test.tsx src/test/calendar-date-navigation.test.tsx
git commit -m "fix: filter calendar by enabled features"
```

### Task 9: Task Detail Quick Add And Header QA

**Files:**
- Modify: `app/(tabs)/tasks/[listId].tsx`
- Test: `src/test/tasks-detail-interactions.test.tsx`

- [ ] **Step 1: Add failing quick-add test**

Append to `src/test/tasks-detail-interactions.test.tsx`:

```ts
it('quick-add creates a task in the current list', async () => {
  const renderer = await renderTaskDetail();
  const input = findByTestID(renderer.root, 'task-detail-quickadd-input');
  const send = findByTestID(renderer.root, 'task-detail-quickadd-send');
  await act(async () => {
    input.props.onChangeText('Buy oat milk');
    await flush();
  });
  await act(async () => {
    await send.props.onPress();
    await flush();
  });
  expect(taskState.create).toHaveBeenCalledWith({
    title: 'Buy oat milk',
    dueDate: null,
    priority: 0,
  });
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/tasks-detail-interactions.test.tsx
```

Expected: FAIL because no quick-add input exists and `create` is not destructured.

- [ ] **Step 3: Implement quick-add**

In `app/(tabs)/tasks/[listId].tsx`:

```ts
import { TextInput } from 'react-native';
import { useState } from 'react';
```

Use hook:

```ts
const { tasks, toggleComplete, remove, create } = useTaskItems(listId ?? null);
const [quickTitle, setQuickTitle] = useState('');
const [quickSaving, setQuickSaving] = useState(false);

async function onQuickAdd() {
  const title = quickTitle.trim();
  if (!title || quickSaving) return;
  setQuickSaving(true);
  try {
    await create({ title, dueDate: null, priority: 0 });
    setQuickTitle('');
  } finally {
    setQuickSaving(false);
  }
}
```

Render sticky bottom element after `ScrollView`:

```tsx
<View style={[styles.quickAddWrap, { paddingBottom: insets.bottom + 10, backgroundColor: C.bg }]}>
  <View style={[styles.quickAdd, { backgroundColor: C.bgCard, borderColor: quickTitle.trim() ? tilePastel : C.lineColor }]}>
    <TextInput
      testID="task-detail-quickadd-input"
      value={quickTitle}
      onChangeText={setQuickTitle}
      placeholder="Add a task..."
      placeholderTextColor={C.ink3}
      style={[styles.quickAddInput, { color: C.inkColor }]}
      returnKeyType="send"
      onSubmitEditing={onQuickAdd}
    />
    <PressScale testID="task-detail-quickadd-send" onPress={onQuickAdd} disabled={!quickTitle.trim() || quickSaving} style={[styles.quickSend, { backgroundColor: quickTitle.trim() ? tilePastel : C.bgSoft }]}>
      <Icon name="arrowUp" size={16} color="#2A241B" />
    </PressScale>
  </View>
</View>
```

Add styles:

```ts
quickAddWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10 },
quickAdd: { minHeight: 52, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 8 },
quickAddInput: { flex: 1, fontFamily: Typography.geistMediumFont, fontSize: 15, paddingVertical: 10 },
quickSend: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
```

- [ ] **Step 4: Run task detail test**

Run:

```bash
pnpm test src/test/tasks-detail-interactions.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/tasks/[listId].tsx" src/test/tasks-detail-interactions.test.tsx
git commit -m "feat: add task quick add"
```

### Task 10: Wishlist Ownership And Filters

**Files:**
- Modify: `instant.schema.ts`
- Modify: `src/hooks/useWishlists.ts`
- Modify: `app/sheets/new-wish.tsx`
- Modify: `app/(tabs)/us/wishlists.tsx`
- Test: `src/test/wishlists.test.ts`
- Test: `src/test/sheets/new-wish.test.tsx`

- [ ] **Step 1: Write failing wishlist ownership tests**

In `src/test/sheets/new-wish.test.tsx`, change happy path to expect `scope`:

```ts
expect(call.scope).toBe('mine');
```

Add:

```ts
it('can save a shared wish', async () => {
  let renderer: any;
  await act(async () => { renderer = TestRenderer.create(<NewWish />); await flush(); });
  await act(async () => {
    findByTestID(renderer.root, 'new-wish-title-input').props.onChangeText('Dinner');
    await flush();
  });
  await act(async () => {
    findByTestID(renderer.root, 'new-wish-scope-shared').props.onPress();
    await flush();
  });
  await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
  expect(wishState.add.mock.calls[0][0].scope).toBe('shared');
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/sheets/new-wish.test.tsx src/test/wishlists.test.ts
```

Expected: FAIL because scope is not written.

- [ ] **Step 3: Add schema and hook support**

In `instant.schema.ts`, add to `wishlistItems`:

```ts
scope: i.string().optional(), // 'mine' | 'partner' | 'shared'
```

In `src/hooks/useWishlists.ts`:

```ts
export type WishScope = 'mine' | 'partner' | 'shared';
```

Extend inputs:

```ts
scope?: WishScope;
```

In `add` update:

```ts
scope: input.scope ?? 'mine',
```

In update:

```ts
if (input.scope !== undefined) updates.scope = input.scope;
```

Map items:

```ts
scope: (i.scope as WishScope | undefined) ?? 'mine',
```

- [ ] **Step 4: Add sheet scope picker**

In `app/sheets/new-wish.tsx`, import `SheetIconLabelPicker` or use `PressScale` row. Add state:

```ts
type Scope = 'mine' | 'partner' | 'shared';
const [scope, setScope] = useState<Scope>((existing?.scope as Scope) ?? 'mine');
```

Render before Tag:

```tsx
<SheetSection title="Who is it for">
  <SheetRow>
    {(['mine', 'partner', 'shared'] as const).map((item) => (
      <PressScale
        key={item}
        testID={`new-wish-scope-${item}`}
        onPress={() => setScope(item)}
        style={[styles.scopePill, { borderColor: scope === item ? C.lavender : C.line, backgroundColor: scope === item ? `${C.lavender}22` : C.card }]}
      >
        <Text style={[Typography.captionMedium, { color: scope === item ? C.lavender : C.fog }]}>
          {item === 'mine' ? 'Mine' : item === 'partner' ? "Theirs" : 'Shared'}
        </Text>
      </PressScale>
    ))}
  </SheetRow>
</SheetSection>
```

Include in payload:

```ts
scope,
```

- [ ] **Step 5: Use scope in wishlist screen**

In `app/(tabs)/us/wishlists.tsx`, change `who` derivation:

```ts
const scope = raw.scope as WhoKind | undefined;
const who: WhoKind =
  scope === 'shared' ? 'shared' : scope === 'partner' ? 'partner' : 'me';
const meta = who === 'me' ? authorMeta(userId) : who === 'partner' ? authorMeta(partnerId) : { name: 'Shared', color: C.accent3 };
```

Change filters:

```ts
if (filter === 'mine') return r.who === 'me';
if (filter === 'theirs') return r.who === 'partner';
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm test src/test/sheets/new-wish.test.tsx src/test/wishlists.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add instant.schema.ts src/hooks/useWishlists.ts app/sheets/new-wish.tsx "app/(tabs)/us/wishlists.tsx" src/test/sheets/new-wish.test.tsx src/test/wishlists.test.ts
git commit -m "feat: persist wishlist ownership"
```

### Task 11: Check-in Energy

**Files:**
- Modify: `instant.schema.ts`
- Modify: `src/hooks/useCheckIns.ts`
- Modify: `app/sheets/new-checkin.tsx`
- Test: `src/test/sheets/new-checkin.test.tsx`
- Test: `src/test/check-in-moods.test.ts`

- [ ] **Step 1: Write failing energy test**

In `src/test/sheets/new-checkin.test.tsx`, add:

```ts
it('persists energy with mood and note', async () => {
  let renderer: any;
  await act(async () => { renderer = TestRenderer.create(<NewCheckin />); await flush(); });
  await act(async () => {
    findByTestID(renderer.root, 'new-checkin-energy-4').props.onPress();
    await flush();
  });
  await act(async () => {
    findByTestID(renderer.root, 'new-checkin-note-input').props.onChangeText('Walked home');
    await flush();
  });
  await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
  expect(checkInState.createOrUpdate).toHaveBeenCalledWith({
    mood: 'soft',
    energy: 4,
    note: 'Walked home',
    isPrivate: false,
  });
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/sheets/new-checkin.test.tsx
```

Expected: FAIL because energy controls do not exist.

- [ ] **Step 3: Add schema and hook support**

In `instant.schema.ts`, add to `checkIns`:

```ts
energy: i.number().optional(),
```

In `src/hooks/useCheckIns.ts`, extend type:

```ts
energy: number | null;
```

Map:

```ts
energy: typeof c.energy === 'number' ? c.energy : null,
```

Input:

```ts
energy?: number | null;
```

Writes:

```ts
energy: input.energy ?? null,
```

- [ ] **Step 4: Add energy picker**

In `app/sheets/new-checkin.tsx`:

```ts
const [energy, setEnergy] = useState(3);
```

Render:

```tsx
<SheetSection title="Energy">
  <SheetRow>
    {[1, 2, 3, 4, 5].map((value) => (
      <PressScale
        key={value}
        testID={`new-checkin-energy-${value}`}
        onPress={() => setEnergy(value)}
        style={[styles.energyDot, { backgroundColor: energy >= value ? active.color : 'transparent', borderColor: active.color }]}
      />
    ))}
  </SheetRow>
</SheetSection>
```

Save:

```ts
energy,
```

- [ ] **Step 5: Run check-in tests**

Run:

```bash
pnpm test src/test/sheets/new-checkin.test.tsx src/test/check-in-moods.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add instant.schema.ts src/hooks/useCheckIns.ts app/sheets/new-checkin.tsx src/test/sheets/new-checkin.test.tsx src/test/check-in-moods.test.ts
git commit -m "feat: capture check-in energy"
```

### Task 12: Milestone Date Regression

**Files:**
- Modify: `src/test/sheets/new-milestone.test.tsx`
- Modify: `app/sheets/new-milestone.tsx`

- [ ] **Step 1: Add regression test for selected date**

In `src/test/sheets/new-milestone.test.tsx`, add:

```ts
it('saves the selected milestone date', async () => {
  let renderer: any;
  await act(async () => { renderer = TestRenderer.create(<NewMilestone />); await flush(); });
  await act(async () => {
    findByTestID(renderer.root, 'new-milestone-title-input').props.onChangeText('Moved in');
    await flush();
  });
  await act(async () => {
    findByTestID(renderer.root, 'new-milestone-date').props.onPress();
    await flush();
  });
  const picker = renderer.root.findAll((n: any) => n.props?.testID === 'sheet-date-picker')[0];
  await act(async () => {
    picker.props.onChange({}, new Date('2026-06-14T00:00:00'));
    await flush();
  });
  await act(async () => { findSaveBtn(renderer.root, { enabled: true }).props.onPress(); await flush(); });
  expect(milestoneState.create.mock.calls[0][0].date).toBe('2026-06-14');
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test**

Run:

```bash
pnpm test src/test/sheets/new-milestone.test.tsx
```

Expected: PASS if current `SheetDateField` already exposes the picker correctly; FAIL if the date picker lacks `testID="sheet-date-picker"`.

- [ ] **Step 3: Add missing testID only when the test fails**

In `src/components/ui/SheetShell.tsx`, inside `SheetDateField`, add to `DateTimePicker`:

```tsx
testID="sheet-date-picker"
```

- [ ] **Step 4: Run test again**

Run:

```bash
pnpm test src/test/sheets/new-milestone.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SheetShell.tsx app/sheets/new-milestone.tsx src/test/sheets/new-milestone.test.tsx
git commit -m "test: cover milestone date selection"
```

### Task 13: Timetable Detail Duplicate Add UI

**Files:**
- Modify: `app/(tabs)/us/timetables/[id].tsx`
- Test: `src/test/timetable-detail-rendering.test.tsx`

- [ ] **Step 1: Write failing duplicate-add test**

In `src/test/timetable-detail-rendering.test.tsx`, add:

```ts
it('renders only the header add action and no floating add button', async () => {
  const renderer = await renderTimetableDetail();
  expect(findByTestID(renderer.root, 'timetable-detail-floating-add')).toBeUndefined();
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/test/timetable-detail-rendering.test.tsx
```

Expected: FAIL because the floating add button is still rendered.

- [ ] **Step 3: Remove floating add button**

In `app/(tabs)/us/timetables/[id].tsx`, delete the bottom/right absolute FAB block that calls `goAdd`. Keep the header add action and empty-state action.

- [ ] **Step 4: Run timetable test**

Run:

```bash
pnpm test src/test/timetable-detail-rendering.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/us/timetables/[id].tsx" src/test/timetable-detail-rendering.test.tsx
git commit -m "fix: remove duplicate timetable add button"
```

### Task 14: Us/Me Dynamic Copy And Static Leak Tests

**Files:**
- Modify: `app/(tabs)/us/index.tsx`
- Test: `src/test/us-index.test.tsx`

- [ ] **Step 1: Add static leak test**

In `src/test/us-index.test.tsx`, add:

```ts
it('does not render hardcoded names, dates, or demo memory copy', async () => {
  const renderer = await render();
  const text = readText(renderer.root).join(' ');
  expect(text).not.toContain('MATTIA × SOFIA');
  expect(text).not.toContain('86% IN SYNC');
  expect(text).not.toContain('Just finished yoga');
  expect(text).not.toContain('ONE YEAR AGO');
  expect(text).not.toContain('THU · 17 · 11');
  act(() => renderer.unmount());
});
```

- [ ] **Step 2: Run test**

Run:

```bash
pnpm test src/test/us-index.test.tsx
```

Expected: PASS if current screen already removed those static sections; FAIL if any static leak remains.

- [ ] **Step 3: Replace any remaining static copy**

Use live values already available in the file:

- Date pill: `format(new Date(), 'EEE · d · M').toUpperCase()` plus names from `user`, `partner`, `activeCouple`.
- Mood: `checkIns.myTodayCheckIn` and `checkIns.partnerTodayCheckIn`.
- On-this-day: first journal entry, love note, or milestone matching month/day; otherwise render `ActionEmptyState`.

- [ ] **Step 4: Run Us tests**

Run:

```bash
pnpm test src/test/us-index.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/us/index.tsx" src/test/us-index.test.tsx
git commit -m "fix: remove static us screen demo copy"
```

### Task 15: Design Accent Consistency And Asset Audit

**Files:**
- Modify: `app/sheets/new-wish.tsx`
- Modify: `app/sheets/new-entry.tsx`
- Modify: `app/sheets/new-checkin.tsx`
- Modify: `app/sheets/new-milestone.tsx`
- Modify: `app/(tabs)/us/wishlists.tsx`
- Modify: `app/sheets/new-timetable.tsx`
- Modify: `src/components/ui/Icon.tsx`
- Test: `src/test/icon.snapshot.test.tsx`
- Test: affected sheet tests

- [ ] **Step 1: Add icon registry assertion**

In `src/test/icon.snapshot.test.tsx`, add:

```ts
import { FEATURE_REGISTRY } from '@/src/lib/features/registry';

it('feature registry icons are renderable', () => {
  for (const feature of Object.values(FEATURE_REGISTRY)) {
    expect(() => create(<Icon name={feature.icon} />)).not.toThrow();
  }
});
```

- [ ] **Step 2: Run icon test**

Run:

```bash
pnpm test src/test/icon.snapshot.test.tsx
```

Expected: PASS because current registry uses existing icons.

- [ ] **Step 3: Align accents**

Apply these exact accent choices:

- `new-wish`: `C.lavender`
- `new-entry`: `C.peach`
- `new-checkin`: keep mood color for selected state but set sheet eyebrow to `C.butter`
- `new-milestone`: default color `C.peach`
- `wishlists` filter active styling: `C.lavender` / lavender soft background
- `new-timetable` partner label: use `partner?.displayName?.split(' ')[0] ?? 'Their'`

- [ ] **Step 4: Generate assets**

No generated image or icon asset is required for this plan. The feature registry maps to existing `IconName` values and current PNG files. Leave `assets/images/icons` unchanged.

- [ ] **Step 5: Run affected tests**

Run:

```bash
pnpm test src/test/icon.snapshot.test.tsx src/test/sheets/new-wish.test.tsx src/test/sheets/new-entry.test.tsx src/test/sheets/new-checkin.test.tsx src/test/sheets/new-milestone.test.tsx
```

Expected: PASS. Update snapshots only when the rendered icon snapshot intentionally changes.

- [ ] **Step 6: Commit**

```bash
git add app/sheets/new-wish.tsx app/sheets/new-entry.tsx app/sheets/new-checkin.tsx app/sheets/new-milestone.tsx "app/(tabs)/us/wishlists.tsx" app/sheets/new-timetable.tsx src/components/ui/Icon.tsx src/test
git commit -m "style: align feature accents"
```

### Task 16: Full Verification

**Files:**
- No planned source edits unless verification finds a failing test caused by this implementation.

- [ ] **Step 1: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 2: Run full test suite**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Start app for visual inspection**

Run:

```bash
pnpm start
```

Expected: Expo starts and prints a local URL or QR code. Keep the process running only for inspection, then stop it.

- [ ] **Step 4: Inspect critical screens**

Use the in-app browser/simulator and verify:

- Onboarding mode selection and feature checklist render with selected defaults.
- Profile Features section toggles modules and keeps Home locked.
- Disabled Tasks/Reminders/Calendar tabs hide.
- Us/Me hub hides disabled cards.
- Direct disabled sheets show the unavailable state.
- Home has no Brooklyn/weather/demo agenda copy.
- Task detail quick-add creates a task.
- Wishlist Mine/Partner/Shared filters show saved records.
- Check-in energy saves.
- Timetable detail has no floating duplicate add button.

- [ ] **Step 5: Final commit for verification fixes**

When verification required fixes:

```bash
git add -u
git commit -m "fix: complete functional verification"
```

If no fixes were needed, do not create an empty commit.

---

## Plan Self-Review

- Spec coverage: onboarding feature selection, Profile toggles, space-level persistence, non-destructive disable behavior, navigation gating, direct sheet guards, Home/Us mock-data cleanup, task quick-add, wishlist ownership, check-in energy, milestone date, timetable duplicate add, design consistency, and verification are each covered by a task.
- Red-flag scan: no task uses TBD/TODO or unspecified implementation.
- Type consistency: feature IDs use `FeatureId`; session mode uses existing `SpaceMode`; wishlist scope uses `WishScope`; check-in energy is `number | null`.
