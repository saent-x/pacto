import { Image, ImageStyle, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  animated?: boolean;
  style?: ImageStyle | ViewStyle;
};

const STATIC_SRC = require('../../../../assets/images/pacto-avatar.png');
const ANIMATED_SRC = require('../../../../assets/images/pacto-avatar.gif');

/**
 * Pacto brand mark. Animated by default (gif), static fallback available.
 * Used as the PixelHero right-slot and as a small badge in screen headers.
 */
export function PactoMark({ size = 32, animated = true, style }: Props) {
  return (
    <Image
      source={animated ? ANIMATED_SRC : STATIC_SRC}
      style={[
        {
          width: size,
          height: size,
        },
        style as ImageStyle,
      ]}
      resizeMode="contain"
    />
  );
}
