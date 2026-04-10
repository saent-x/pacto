import React, { useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type BrushUnderlineProps = {
  children: React.ReactNode;
  color: string;
  style?: StyleProp<ViewStyle>;
  brushHeight?: number;
};

const VIEWBOX_WIDTH = 160;
const VIEWBOX_HEIGHT = 24;

export function BrushUnderline({
  children,
  color,
  style,
  brushHeight = 18,
}: BrushUnderlineProps) {
  const [contentWidth, setContentWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    if (nextWidth !== contentWidth) {
      setContentWidth(nextWidth);
    }
  };

  return (
    <View style={[styles.root, style]}>
      <View onLayout={handleLayout} style={styles.content}>
        {children}
        {contentWidth > 0 ? (
          <Svg
            width={contentWidth + 6}
            height={brushHeight}
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="none"
            pointerEvents="none"
            style={styles.stroke}
          >
            <Path
              d="M4 15 C 24 23, 52 7, 78 14 S 126 20, 156 11 L 156 19 C 126 24, 96 25, 70 22 S 28 20, 4 17 Z"
              fill={color}
              opacity={0.26}
            />
            <Path
              d="M6 12 C 22 18, 48 8, 76 11 S 126 16, 154 9 L 154 15 C 126 20, 98 21, 72 18 S 28 16, 6 14 Z"
              fill={color}
              opacity={0.68}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  content: {
    alignSelf: 'flex-start',
    paddingBottom: 8,
  },
  stroke: {
    position: 'absolute',
    left: -3,
    bottom: -1,
  },
});
