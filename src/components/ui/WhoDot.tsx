import { Text, View } from 'react-native';
import { useTheme } from '@/src/lib/theme';
import type { Who } from '@/src/lib/timetables-data';

export function WhoDot({
  who,
  size = 18,
  borderColor,
  meInitial = 'Y',
  partnerInitial = 'P',
}: {
  who: Who;
  size?: number;
  borderColor?: string;
  meInitial?: string;
  partnerInitial?: string;
}) {
  const { C, F } = useTheme();
  const font = Math.round(size * 0.5);
  const peach = { bg: '#F4A68C', fg: '#3A1F14', letter: meInitial.charAt(0).toUpperCase() };
  const lav = { bg: '#B8A8E8', fg: '#1F1635', letter: partnerInitial.charAt(0).toUpperCase() };
  const bubble = (cfg: typeof peach, overlap = false) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: cfg.bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: overlap ? -5 : 0,
        borderWidth: overlap ? 1.5 : 0,
        borderColor: borderColor ?? C.ink,
      }}
    >
      <Text
        style={{
          color: cfg.fg,
          fontSize: font,
          fontFamily: F.displayBold,
        }}
      >
        {cfg.letter}
      </Text>
    </View>
  );
  if (who === 'both') {
    return (
      <View style={{ flexDirection: 'row' }}>
        {bubble(peach)}
        {bubble(lav, true)}
      </View>
    );
  }
  return bubble(who === 'partner' ? lav : peach);
}
