import type { IconName } from '@/src/components/ui/Icon';

export type CheckInStateId = 'rough' | 'low' | 'okay' | 'steady' | 'good' | 'great';

export type CheckInStateMeta = {
  id: CheckInStateId;
  label: string;
  color: string;
  icon: IconName;
};

export const CHECK_IN_STATES: CheckInStateMeta[] = [
  {
    id: 'rough',
    label: 'Rough',
    color: '#D96B52',
    icon: 'droplet',
  },
  {
    id: 'low',
    label: 'Low',
    color: '#8CB5CD',
    icon: 'moon',
  },
  {
    id: 'okay',
    label: 'Okay',
    color: '#9C7530',
    icon: 'minus',
  },
  {
    id: 'steady',
    label: 'Steady',
    color: '#72AA9C',
    icon: 'activity',
  },
  {
    id: 'good',
    label: 'Good',
    color: '#637F55',
    icon: 'star',
  },
  {
    id: 'great',
    label: 'Great',
    color: '#A89BC8',
    icon: 'sparkle',
  },
];

const BY_ID = Object.fromEntries(CHECK_IN_STATES.map((state) => [state.id, state])) as Record<
  CheckInStateId,
  CheckInStateMeta
>;

const LEGACY_ALIASES: Record<string, CheckInStateId> = {
  '1': 'rough',
  '2': 'low',
  '3': 'okay',
  '4': 'steady',
  '5': 'good',
  '6': 'great',
  soft: 'good',
  happy: 'great',
  glowing: 'great',
  okay: 'steady',
  down: 'low',
  struggling: 'rough',
};

export function normalizeCheckInState(value: string | null | undefined): CheckInStateId {
  if (!value) return 'okay';

  const key = value.trim().toLowerCase();
  if (key in BY_ID) return key as CheckInStateId;

  return LEGACY_ALIASES[key] ?? 'okay';
}

export function getCheckInStateMeta(value: string | null | undefined): CheckInStateMeta {
  return BY_ID[normalizeCheckInState(value)];
}
