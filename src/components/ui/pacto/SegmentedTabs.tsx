import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { useTheme } from '@/src/lib/theme';
import { Typography } from '@/src/constants/typography';

export type SegmentedTabOption<K extends string> = {
  key: K;
  label?: ReactNode;
  icon?: IconName;
  testID?: string;
};

type Props<K extends string> = {
  options: SegmentedTabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** compact = icon-only square buttons. labeled = full-width segments with text (and optional icon). */
  variant?: 'compact' | 'labeled';
  style?: ViewStyle;
  testID?: string;
};

export function SegmentedTabs<K extends string>({
  options,
  value,
  onChange,
  variant = 'labeled',
  style,
  testID,
}: Props<K>) {
  const { C } = useTheme();
  const compact = variant === 'compact';

  return (
    <View
      testID={testID}
      style={[
        styles.track,
        {
          alignSelf: compact ? 'flex-start' : 'stretch',
        },
        style,
      ]}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <PressScale
            key={o.key}
            testID={o.testID}
            onPress={() => onChange(o.key)}
            style={[
              compact ? styles.segmentCompact : styles.segmentLabeled,
              {
                backgroundColor: active ? C.inkColor : C.bgCard,
                borderColor: active ? C.inkColor : C.line2,
              },
            ]}
          >
            {o.icon ? (
              <Icon
                name={o.icon}
                size={compact ? 13 : 14}
                color={active ? C.bg : C.ink2}
                strokeWidth={active ? 2.4 : 2}
              />
            ) : null}
            {!compact && o.label ? (
              <Text
                style={[
                  Typography.captionMedium,
                  {
                    color: active ? C.bg : C.ink2,
                    marginLeft: o.icon ? 6 : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            ) : null}
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentLabeled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentCompact: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
});
