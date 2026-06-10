import type React from 'react';
import { unstable_createElement } from 'react-native-web';
import { useColors } from '@/theme';
import { FONTS } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');

// Web replacement for the native date/time pickers: a quiet HTML input styled
// like the sheets' underlined fields (mono value, hairline rule, accentless).
export function QPickerWeb({
  value,
  onChange,
  mode,
}: {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
}): React.ReactNode {
  const C = useColors();
  const inputValue =
    mode === 'time'
      ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  return unstable_createElement('input', {
    type: mode,
    value: inputValue,
    onChange: (e: any) => {
      const v: string = e?.target?.value ?? '';
      if (!v) return; // cleared — keep the previous value rather than NaN dates
      const next = new Date(value);
      if (mode === 'time') {
        const [h, m] = v.split(':').map(Number);
        next.setHours(h, m, 0, 0);
      } else {
        const [y, mo, d] = v.split('-').map(Number);
        next.setFullYear(y, mo - 1, d);
      }
      onChange(next);
    },
    style: {
      fontFamily: FONTS.mono500,
      fontSize: 17,
      color: C.ink,
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderBottomWidth: 1.5,
      borderBottomStyle: 'solid',
      borderBottomColor: C.line,
      paddingBottom: 11,
      width: '100%',
      outline: 'none',
    },
  });
}
