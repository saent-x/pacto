// Pacto mood scale — each mood has its own representative color and a line-art
// glyph (an abstract mouth curve, frown → smile). Not the accent color, not emoji.

export type MoodId = 'rough' | 'low' | 'okay' | 'steady' | 'good' | 'great';

export const MOODS: { id: MoodId; label: string; v: number; color: string }[] = [
  { id: 'rough', label: 'Rough', v: 0.12, color: '#C2564A' }, // warm red
  { id: 'low', label: 'Low', v: 0.3, color: '#6776B0' }, // periwinkle blue
  { id: 'okay', label: 'Okay', v: 0.5, color: '#C2972F' }, // muted gold
  { id: 'steady', label: 'Steady', v: 0.68, color: '#4F938A' }, // teal
  { id: 'good', label: 'Good', v: 0.84, color: '#56A065' }, // green
  { id: 'great', label: 'Great', v: 1, color: '#E0A23C' }, // warm amber
];

// Abstract mouth-curve glyphs (24x24, stroke). ∩ = frown, — = flat, ∪ = smile.
export const MOOD_FACE: Record<MoodId, string> = {
  rough: 'M7.5 15.5 C 10 12 14 12 16.5 15.5',
  low: 'M8 15 C 10 13.4 14 13.4 16 15',
  okay: 'M8 14.5 L 16 14.5',
  steady: 'M8 14 C 10 15.4 14 15.4 16 14',
  good: 'M7.8 13.6 C 10 16 14 16 16.2 13.6',
  great: 'M7.5 13 C 10 17 14 17 16.5 13',
};

export const moodById = (id?: string | null) => MOODS.find((m) => m.id === id);
export const moodColor = (id?: string | null) => moodById(id)?.color ?? '#9C9EA3';
