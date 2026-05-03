import { StyleSheet, Text, View } from 'react-native';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

interface Props {
  percent: number;
  isOverThreshold: boolean;
}

export function QuotaBadge({ percent, isOverThreshold }: Props) {
  const { C } = useTheme();
  if (percent < 70) return null;
  const color = isOverThreshold ? '#c0392b' : C.ink3;
  return (
    <View style={styles.wrap}>
      <Text style={[Typography.caption, { color }]}>{`Storage: ${percent}% used`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { paddingHorizontal: 16, paddingVertical: 6 } });
