import React from 'react';
import { Text, View, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { avatarLetter, type Member } from './SpaceProvider';

const ring = (color: string): ViewStyle =>
  ({ boxShadow: `0px 0px 0px 2px ${color}` }) as unknown as ViewStyle;

export function MemberAvatar({
  member,
  size = 30,
  ringColor,
}: {
  member: Pick<Member, 'displayName' | 'isYou'>;
  size?: number;
  ringColor?: string;
}) {
  const C = useColors();
  const you = member.isYou;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: you ? C.accent : C.ink,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ringColor ? ring(ringColor) : null,
      ]}
    >
      <Text
        style={{
          fontFamily: FONTS.display600,
          fontSize: size * 0.5,
          lineHeight: size * 0.62,
          color: you ? C.onAccent : C.bg,
        }}
      >
        {avatarLetter(member.displayName)}
      </Text>
    </View>
  );
}

export function MemberStack({
  members,
  size = 28,
  max = 4,
  ringColor,
  style,
}: {
  members: Pick<Member, 'userId' | 'displayName' | 'isYou'>[];
  size?: number;
  max?: number;
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const r = ringColor ?? C.bg;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  const overlap = -size * 0.34;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {shown.map((m, i) => (
        <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: shown.length - i }}>
          <MemberAvatar member={m} size={size} ringColor={r} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            {
              marginLeft: overlap,
              zIndex: 0,
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: C.surface2,
              alignItems: 'center',
              justifyContent: 'center',
            },
            ring(r),
          ]}
        >
          <Text style={{ fontFamily: FONTS.sans600, fontSize: size * 0.36, color: C.ink2 }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}
