import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';

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
