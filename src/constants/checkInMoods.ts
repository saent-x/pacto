export type CheckInMoodId =
  | 'struggling'
  | 'down'
  | 'okay'
  | 'good'
  | 'happy'
  | 'loved'
  | 'amazing';

export type CheckInMoodMeta = {
  id: CheckInMoodId;
  label: string;
  emoji: string;
  icon:
    | 'battery'
    | 'cloud-rain'
    | 'minus-circle'
    | 'sun'
    | 'smile'
    | 'heart'
    | 'star';
  legacy: string[];
};

export const CHECK_IN_MOODS: CheckInMoodMeta[] = [
  { id: 'struggling', label: 'Struggling', emoji: '😫', icon: 'battery', legacy: ['😫'] },
  { id: 'down', label: 'Down', emoji: '😔', icon: 'cloud-rain', legacy: ['😔'] },
  { id: 'okay', label: 'Okay', emoji: '😐', icon: 'minus-circle', legacy: ['😐'] },
  { id: 'good', label: 'Good', emoji: '🙂', icon: 'sun', legacy: ['🙂'] },
  { id: 'happy', label: 'Happy', emoji: '😊', icon: 'smile', legacy: ['😊'] },
  { id: 'loved', label: 'Loved', emoji: '🥰', icon: 'heart', legacy: ['🥰'] },
  { id: 'amazing', label: 'Amazing', emoji: '🤩', icon: 'star', legacy: ['🤩'] },
];

export function normalizeCheckInMood(value: string | null | undefined): CheckInMoodId | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  const match = CHECK_IN_MOODS.find(
    (mood) => mood.id === normalized || mood.legacy.includes(value),
  );

  return match?.id ?? null;
}

export function getCheckInMoodMeta(value: string | null | undefined): CheckInMoodMeta | null {
  const moodId = normalizeCheckInMood(value);
  if (!moodId) return null;

  return CHECK_IN_MOODS.find((mood) => mood.id === moodId) ?? null;
}
