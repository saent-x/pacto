import { Image, ImageStyle, StyleProp } from 'react-native';

interface Props {
  size?: number;
  animated?: boolean;
  style?: StyleProp<ImageStyle>;
}

const PACTO_GIF = require('@/assets/images/pacto-avatar.gif');
const PACTO_PNG = require('@/assets/images/pacto-avatar.png');

/**
 * The Pacto mascot/brand mark. Mirrors the design's `PactoMark` —
 * an animated 8-bit avatar shown at the top of the memories feed.
 */
export function PactoMark({ size = 28, animated = true, style }: Props) {
  return (
    <Image
      source={animated ? PACTO_GIF : PACTO_PNG}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
