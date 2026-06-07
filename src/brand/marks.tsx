import React from 'react';
import { View, Text, StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../theme';
import { FONTS } from '../theme/tokens';

const MASCOT = require('../../assets/images/pacto-icon.png');

// The Pacto brand mascot (red pixel character). This is the real app mark.
export function PactoMark({ size = 56, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={MASCOT}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}

// App-tile "p" mark — rounded ink tile, pixel glyph, single accent pixel.
export function PactoTile({ size = 56, radius }: { size?: number; radius?: number }) {
  const C = useColors();
  const r = radius != null ? radius : size * 0.3;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: C.ink,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.pixel,
          fontSize: size * 0.62,
          lineHeight: size * 0.62,
          color: C.bg,
          marginTop: -size * 0.04,
        }}
      >
        p
      </Text>
      <View
        style={{
          position: 'absolute',
          right: size * 0.2,
          top: size * 0.22,
          width: size * 0.12,
          height: size * 0.12,
          backgroundColor: C.accent,
        }}
      />
    </View>
  );
}

// Wordmark — "pacto" in the brand pixel face, ink + accent pixel.
export function PactoWordmark({
  size = 30,
  color,
  accentDot = true,
}: {
  size?: number;
  color?: string;
  accentDot?: boolean;
}) {
  const C = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.16 }}>
      <Text
        style={{
          fontFamily: FONTS.pixel,
          fontSize: size,
          lineHeight: size,
          letterSpacing: 0.5,
          color: color ?? C.ink,
        }}
      >
        pacto
      </Text>
      {accentDot && (
        <View
          style={{
            width: size * 0.16,
            height: size * 0.16,
            backgroundColor: C.accent,
            marginBottom: size * 0.08,
          }}
        />
      )}
    </View>
  );
}

// Lockup — tile + wordmark, for mastheads.
export function PactoLockup({ tile = 34, word = 26, gap = 12 }: { tile?: number; word?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <PactoTile size={tile} />
      <PactoWordmark size={word} accentDot={false} />
    </View>
  );
}
