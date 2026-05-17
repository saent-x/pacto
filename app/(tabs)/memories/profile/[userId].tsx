import { useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/ui/pacto';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemberProfile } from '@/src/hooks/memories/useMemberProfile';
import { MemoryPost } from '@/src/components/ui/pacto/memories/MemoryPost';

export default function MemberProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const session = useSession() as any;
  const spaceId = session?.activeCouple?.couple?.id ?? session?.space?.id;
  const { user, membership, memories } = useMemberProfile(userId, spaceId);

  return (
    <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top + 80 }]}>
      <View style={styles.header}>
        <Avatar
          person={{ initial: (user?.displayName ?? '?').charAt(0).toUpperCase(), color: C.accent, avatarUrl: user?.avatarUrl }}
          size={64}
        />
        <Text style={[Typography.title, { color: C.inkColor, marginTop: 12 }]}>{user?.displayName ?? 'Member'}</Text>
        {membership?.joinedAt ? (
          <Text style={[Typography.caption, { color: C.ink3 }]}>{`Member since ${format(membership.joinedAt, 'MMM yyyy')}`}</Text>
        ) : null}
        <Text style={[Typography.caption, { color: C.ink3, marginTop: 4 }]}>{`${memories.length} memories`}</Text>
      </View>
      <FlatList
        data={memories}
        keyExtractor={(m: any) => m.id}
        renderItem={({ item, index }) => (
          <MemoryPost
            memory={item as any}
            variant="feed"
            isLast={index === memories.length - 1}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: 'center', padding: 24 },
});
