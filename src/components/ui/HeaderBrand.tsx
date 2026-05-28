import { View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import { Display, Overline } from './atoms';
import { PulsingDot } from './pacto/PulsingDot';
import { shouldAppendAccentDot } from './titlePunctuation';

export function HeaderBrand({
  eyebrow,
  title,
  accent,
  size = 30,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  size?: number;
}) {
  const { C } = useTheme();
  const acc = accent ?? C.gold;
  return (
    <View style={{ alignItems: 'center' }}>
      {!!eyebrow && (
        <Overline style={{ marginBottom: 4, textAlign: 'center' }}>{eyebrow}</Overline>
      )}
      <Display size={size} style={{ textAlign: 'center', lineHeight: size * 1.15, paddingBottom: 2 }}>
        {title}
        {shouldAppendAccentDot(title) ? <PulsingDot color={acc} /> : null}
      </Display>
    </View>
  );
}
