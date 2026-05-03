import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Memories-feed icons rendered inline as SVG so the strokes match the
 * Claude Design `Icon` set verbatim. Path data lifted directly from
 * `coupl-design-ii/project/components.jsx`.
 *
 * The app's general-purpose `Icon` component renders raster PNGs; we use
 * SVG here so a few niche glyphs (Threads `reply` bubble, Threads `repost`
 * loop, Threads `send` paper plane) stay crisp at any size and tint.
 */
export type MemoriesIconName =
  | 'heart'
  | 'reply'
  | 'repost'
  | 'send'
  | 'dots'
  | 'menu'
  | 'search'
  | 'plus';

interface Props {
  name: MemoriesIconName;
  size?: number;
  color?: string;
  /** Stroke width; design default = 1.6, accent active = 2 */
  stroke?: number;
  /** Set to true for filled-heart "active" state. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MemoriesIcon({
  name,
  size = 18,
  color = '#000',
  stroke = 1.6,
  filled = false,
  style,
}: Props) {
  const baseProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: style as any,
  };

  switch (name) {
    case 'heart':
      return (
        <Svg {...baseProps}>
          <Path
            d="M12 20S4 14.5 4 9.5C4 7 6 5 8.5 5c1.7 0 3 .8 3.5 2 .5-1.2 1.8-2 3.5-2C18 5 20 7 20 9.5c0 5-8 10.5-8 10.5z"
            fill={filled ? color : 'none'}
          />
        </Svg>
      );
    case 'reply':
      return (
        <Svg {...baseProps}>
          <Path d="M21 12c0 4.5-4 8-9 8a10 10 0 0 1-3.5-.6L3 21l1.4-4.5A8 8 0 0 1 3 12c0-4.5 4-8 9-8s9 3.5 9 8z" />
        </Svg>
      );
    case 'repost':
      return (
        <Svg {...baseProps}>
          <Path d="M5 8h11l-2-2M19 16H8l2 2" />
        </Svg>
      );
    case 'send':
      return (
        <Svg {...baseProps}>
          <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </Svg>
      );
    case 'dots':
      return (
        <Svg {...baseProps} fill={color} stroke="none">
          <Circle cx={6} cy={12} r={1.5} />
          <Circle cx={12} cy={12} r={1.5} />
          <Circle cx={18} cy={12} r={1.5} />
        </Svg>
      );
    case 'menu':
      return (
        <Svg {...baseProps}>
          <Path d="M4 7h16M4 12h16M4 17h10" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...baseProps}>
          <Circle cx={11} cy={11} r={6.5} />
          <Path d="M16 16l4 4" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...baseProps}>
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      );
  }
}
