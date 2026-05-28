import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ActionEmptyState } from '@/src/components/ui/pacto/ActionEmptyState';
import { useTheme } from '@/src/lib/theme';

export function EmptyMemoriesState() {
  const { C } = useTheme();
  return (
    <View style={styles.wrap}>
      <ActionEmptyState
        icon="feather"
        eyebrow="No memories yet"
        title="Start the thread."
        body="Capture one detail, a quote, a photo, or a small win. It becomes easier to find later."
        actionLabel="New memory"
        accent={C.accent}
        onAction={() => router.push('/sheets/memory-composer' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18, paddingTop: 28 },
});
