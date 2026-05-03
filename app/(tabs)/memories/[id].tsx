import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useMemory } from '@/src/hooks/memories/useMemory';
import { MemoryCard } from '@/src/components/ui/pacto/memories/MemoryCard';

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { memory } = useMemory(id);

  if (!memory) {
    return (
      <View style={[styles.empty, { backgroundColor: C.bg }]}>
        <Text style={[Typography.body, { color: C.ink3 }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top + 80 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <MemoryCard memory={memory as any} variant="detail" />
        {((memory as any).replies ?? []).map((r: any) => (
          <MemoryCard key={r.id} memory={r} variant="reply" />
        ))}
      </ScrollView>
      <View style={[styles.replyBar, { borderColor: C.ink3, backgroundColor: C.bg, paddingBottom: insets.bottom + 8 }]}>
        <PressScale
          onPress={() => router.push(`/sheets/memory-composer?mode=reply&parentId=${id}` as any)}
          style={[styles.replyInput, { borderColor: C.ink3 }]}
        >
          <Text style={[Typography.body, { color: C.ink3 }]}>Add a reply…</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  replyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  replyInput: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
});
