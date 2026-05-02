import type { IconName } from '@/src/components/ui/Icon';
import type { SpaceMode } from '@/src/lib/session';

export type FeatureId =
  | 'tasks'
  | 'calendar'
  | 'wishlist'
  | 'memories'
  | 'journal'
  | 'checkins'
  | 'recurring'
  | 'timetable'
  | 'vision'
  | 'goals';

export type FeatureEntry = {
  id: FeatureId;
  label: string;
  description: string;
  icon: IconName;
  supportedModes: readonly SpaceMode[];
  defaultForSolo: boolean;
  defaultForPair: boolean;
  defaultForCrew: boolean;
};

const FEATURE_REGISTRY: readonly FeatureEntry[] = [
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Track shared and personal to-dos.',
    icon: 'checkSquare',
    supportedModes: ['solo', 'pair', 'crew'],
    defaultForSolo: true,
    defaultForPair: true,
    defaultForCrew: true,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Plan events, dates, and important days.',
    icon: 'calendar',
    supportedModes: ['solo', 'pair', 'crew'],
    defaultForSolo: true,
    defaultForPair: true,
    defaultForCrew: true,
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    description: 'Save gift ideas and things to buy.',
    icon: 'gift',
    supportedModes: ['pair', 'crew'],
    defaultForSolo: false,
    defaultForPair: true,
    defaultForCrew: true,
  },
  {
    id: 'memories',
    label: 'Memories',
    description: 'Keep notes, milestones, and moments.',
    icon: 'heart',
    supportedModes: ['pair', 'crew'],
    defaultForSolo: false,
    defaultForPair: true,
    defaultForCrew: true,
  },
  {
    id: 'journal',
    label: 'Journal',
    description: 'Write private and shared reflections.',
    icon: 'book',
    supportedModes: ['solo', 'pair'],
    defaultForSolo: true,
    defaultForPair: true,
    defaultForCrew: false,
  },
  {
    id: 'checkins',
    label: 'Check-ins',
    description: 'Capture quick mood and relationship updates.',
    icon: 'messageCircle',
    supportedModes: ['solo', 'pair'],
    defaultForSolo: false,
    defaultForPair: true,
    defaultForCrew: false,
  },
  {
    id: 'recurring',
    label: 'Recurring',
    description: 'Manage repeating reminders and routines.',
    icon: 'repeat',
    supportedModes: ['solo', 'pair', 'crew'],
    defaultForSolo: false,
    defaultForPair: true,
    defaultForCrew: true,
  },
  {
    id: 'timetable',
    label: 'Timetable',
    description: 'Organize weekly routines and schedules.',
    icon: 'grid',
    supportedModes: ['solo', 'pair', 'crew'],
    defaultForSolo: false,
    defaultForPair: false,
    defaultForCrew: true,
  },
  {
    id: 'vision',
    label: 'Vision',
    description: 'Shape shared plans and long-term direction.',
    icon: 'eye',
    supportedModes: ['pair', 'crew'],
    defaultForSolo: false,
    defaultForPair: false,
    defaultForCrew: true,
  },
  {
    id: 'goals',
    label: 'Goals',
    description: 'Set priorities and track progress.',
    icon: 'flag',
    supportedModes: ['solo', 'pair', 'crew'],
    defaultForSolo: true,
    defaultForPair: false,
    defaultForCrew: true,
  },
];

const FEATURES_BY_ID = new Map<FeatureId, FeatureEntry>(
  FEATURE_REGISTRY.map((feature) => [feature.id, feature]),
);

const DEFAULT_FLAG_BY_MODE = {
  solo: 'defaultForSolo',
  pair: 'defaultForPair',
  crew: 'defaultForCrew',
} as const satisfies Record<SpaceMode, keyof Pick<
  FeatureEntry,
  'defaultForSolo' | 'defaultForPair' | 'defaultForCrew'
>>;

export function getAllFeatures(): readonly FeatureEntry[] {
  return FEATURE_REGISTRY;
}

export function getFeature(id: string): FeatureEntry | undefined {
  return FEATURES_BY_ID.get(id as FeatureId);
}

export function getDefaultFeatureIds(mode: SpaceMode): FeatureId[] {
  const defaultFlag = DEFAULT_FLAG_BY_MODE[mode];

  return FEATURE_REGISTRY
    .filter((feature) => feature[defaultFlag] && isFeatureSupportedForMode(feature.id, mode))
    .map((feature) => feature.id);
}

export function getSupportedFeatures(mode: SpaceMode): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((feature) => feature.supportedModes.includes(mode));
}

export function isFeatureSupportedForMode(featureId: string, mode: SpaceMode): boolean {
  return getFeature(featureId)?.supportedModes.includes(mode) ?? false;
}

export function sanitizeFeatureIds(ids: readonly string[], mode: SpaceMode): FeatureId[] {
  const requested = new Set(ids);

  return FEATURE_REGISTRY
    .filter((feature) => requested.has(feature.id) && feature.supportedModes.includes(mode))
    .map((feature) => feature.id);
}
