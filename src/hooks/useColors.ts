import { useTheme } from '@/src/lib/theme';
import { themes } from '@/src/constants/colors';

export function useColors() {
  const { mode } = useTheme();
  return themes[mode];
}
