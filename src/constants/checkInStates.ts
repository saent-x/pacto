import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '@/src/components/ui/Icon';

export type CheckInStateId = 'rough' | 'low' | 'steady' | 'soft';

export type CheckInStateMeta = {
  id: CheckInStateId;
  label: string;
  color: string;
  icon: IconName;
  image: ImageSourcePropType;
};

export const CHECK_IN_STATES: CheckInStateMeta[] = [
  {
    id: 'rough',
    label: 'rough',
    color: '#D6BFB6',
    icon: 'zap',
    image: require('../../assets/images/checkins/checkin-rough.png'),
  },
  {
    id: 'low',
    label: 'low',
    color: '#C9D6E2',
    icon: 'cloudRain',
    image: require('../../assets/images/checkins/checkin-low.png'),
  },
  {
    id: 'steady',
    label: 'steady',
    color: '#E8DEC9',
    icon: 'minus',
    image: require('../../assets/images/checkins/checkin-steady.png'),
  },
  {
    id: 'soft',
    label: 'soft',
    color: '#D8E2C7',
    icon: 'cloud',
    image: require('../../assets/images/checkins/checkin-soft.png'),
  },
];

const BY_ID = Object.fromEntries(CHECK_IN_STATES.map((state) => [state.id, state])) as Record<
  CheckInStateId,
  CheckInStateMeta
>;

const LEGACY_ALIASES: Record<string, CheckInStateId> = {
  '1': 'soft',
  '2': 'steady',
  '3': 'low',
  '4': 'rough',
  good: 'soft',
  great: 'soft',
  glowing: 'soft',
  okay: 'steady',
  down: 'low',
  struggling: 'rough',
};

export function normalizeCheckInState(value: string | null | undefined): CheckInStateId {
  if (!value) return 'steady';

  const key = value.trim().toLowerCase();
  if (key in BY_ID) return key as CheckInStateId;

  return LEGACY_ALIASES[key] ?? 'steady';
}

export function getCheckInStateMeta(value: string | null | undefined): CheckInStateMeta {
  return BY_ID[normalizeCheckInState(value)];
}
