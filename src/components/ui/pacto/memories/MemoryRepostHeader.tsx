import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/src/components/ui/Icon';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

export function MemoryRepostHeader({ reposterName }: { reposterName: string }) {
  const { C } = useTheme();
  return (
    <View style={styles.row}>
      <Icon name="repeat" size={14} color={C.ink3} />
      <Text style={[Typography.caption, { color: C.ink3, marginLeft: 6 }]}>{`${reposterName} reposted`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
});
