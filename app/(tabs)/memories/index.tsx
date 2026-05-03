import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 80, backgroundColor: C.bg }]}>
      <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 8 }]}>
        COMING SOON
      </Text>
      <Text style={[Typography.title, { color: C.inkColor, textAlign: 'center' }]}>
        Memories arrives shortly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
