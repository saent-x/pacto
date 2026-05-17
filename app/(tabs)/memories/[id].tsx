import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useMemory } from '@/src/hooks/memories/useMemory';
import { MemoryPost } from '@/src/components/ui/pacto/memories/MemoryPost';
import { Avatar } from '@/src/components/ui/pacto/Avatar';
import { useSession } from '@/src/hooks/useSession';

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const session = useSession() as any;
  const { memory } = useMemory(id);

  if (!memory) {
    return (
      <View style={[styles.empty, { backgroundColor: C.bg }]}>
        <Text style={[Typography.body, { color: C.ink3 }]}>Loading…</Text>
      </View>
    );
  }

  const replies: any[] = (memory as any).replies ?? [];

  return (
    <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top + 80 }]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <MemoryPost memory={memory as any} variant="detail" isLast={replies.length === 0} />
        {replies.map((r, i) => (
          <MemoryPost
            key={r.id}
            memory={r}
            variant="reply"
            isLast={i === replies.length - 1}
          />
        ))}
      </ScrollView>
      <View
        style={[
          styles.replyBar,
          { borderTopColor: C.lineColor, backgroundColor: C.bg, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <PressScale
          onPress={() =>
            router.push(`/sheets/memory-composer?mode=reply&parentId=${id}` as any)
          }
          style={[styles.replyInput, { borderColor: C.lineColor, backgroundColor: C.bgCard }]}
        >
          <Text style={[Typography.body, { color: C.ink3 }]}>Add a reply…</Text>
        </PressScale>
        <Avatar
          person={{
            initial: (session?.profile?.displayName ?? session?.user?.displayName ?? '?')
              .charAt(0)
              .toUpperCase(),
            color: C.accent,
            avatarUrl: session?.profile?.avatarUrl ?? session?.user?.avatarUrl ?? null,
          }}
          size={38}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  replyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
