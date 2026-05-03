import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

export function EmptyMemoriesState() {
  const { C } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[Typography.eyebrow, { color: C.ink3, marginBottom: 8 }]}>NO MEMORIES YET</Text>
      <Text style={[Typography.title, { color: C.inkColor, textAlign: 'center', marginBottom: 16 }]}>
        Capture your first memory.
      </Text>
      <PressScale
        onPress={() => router.push('/sheets/memory-composer' as any)}
        style={[styles.cta, { backgroundColor: C.accent }]}
      >
        <Text style={[Typography.body, { color: '#fff', fontWeight: '600' }]}>+ New memory</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  cta: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
});
