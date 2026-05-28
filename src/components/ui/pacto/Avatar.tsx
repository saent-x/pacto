import { useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { resolveAvatarSource } from '@/src/constants/defaultAvatars';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';

export type Person = {
  initial?: string;
  color?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

type AvatarProps = {
  person?: Person | null;
  size?: number;
  ring?: string;
  style?: ViewStyle;
};

/**
 * Soft circle avatar with initial. Optional outer ring.
 *
 * Design source: /tmp/pacto-design/coupl-design-ii/project/components.jsx (Avatar)
 */
export function Avatar({ person, size = 36, ring, style }: AvatarProps) {
  const { C } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);
  const initial =
    person?.initial?.charAt(0)?.toUpperCase() ||
    person?.displayName?.charAt(0)?.toUpperCase() ||
    '?';
  const bg = person?.color ?? C.accent;
  const avatarSource = resolveAvatarSource(person?.avatarUrl);
  // Uploaded photos use { uri }; bundled defaults use require() and resolve to
  // numeric native asset references.
  const isUploaded =
    !!avatarSource &&
    typeof avatarSource === 'object' &&
    typeof (avatarSource as { uri?: string }).uri === 'string' &&
    !!person?.avatarUrl &&
    !person.avatarUrl.startsWith('pacto:');
  const showImage = !!avatarSource && !imgFailed;

  const wrap: ViewStyle = {
    width: size,
    height: size,
    borderRadius: 999,
    backgroundColor: bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    ...(ring
      ? {
          borderWidth: 2,
          borderColor: ring,
        }
      : null),
    ...style,
  };

  return (
    <View style={wrap}>
      {showImage ? (
        <Image
          source={avatarSource}
          style={{ width: size, height: size }}
          resizeMode={isUploaded ? 'cover' : 'contain'}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text
          style={{
            fontFamily: Typography.geistSemiBoldFont,
            fontSize: size * 0.42,
            color: '#2A241B',
            letterSpacing: 0,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

type PairProps = {
  a?: Person | null;
  b?: Person | null;
  size?: number;
  gap?: number;
};

export function AvatarPair({ a, b, size = 30, gap = -8 }: PairProps) {
  return (
    <View style={styles.pair}>
      <Avatar person={a} size={size} />
      <View style={{ marginLeft: gap }}>
        <Avatar person={b} size={size} />
      </View>
    </View>
  );
}

type CrewProps = {
  people?: Person[];
  size?: number;
};

export function CrewStack({ people, size = 32 }: CrewProps) {
  const { C } = useTheme();
  const list =
    people && people.length
      ? people.slice(0, 4)
      : [
          { initial: 'M', color: C.accent },
          { initial: 'J', color: C.accent2 },
          { initial: 'L', color: C.accent3 },
          { initial: 'R', color: C.lavender },
        ];
  const dotSize = Math.max(18, size * 0.82);
  const outerDotSize = dotSize + 4;

  return (
    <View style={[styles.crew, { width: outerDotSize * 2 + 4 }]}>
      {list.map((p, i) => (
        <View key={i}>
          <View
            style={{
              backgroundColor: C.bg,
              padding: 2,
              borderRadius: 999,
            }}
          >
            <Avatar person={p} size={dotSize} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
