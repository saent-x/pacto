import { useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatureRouteGuard } from '@/src/components/features/FeatureRouteGuard';
import { Avatar } from '@/src/components/ui/pacto';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useMemberProfile } from '@/src/hooks/memories/useMemberProfile';
import { MemoryPost } from '@/src/components/ui/pacto/memories/MemoryPost';
import { uniqueSpaceIds } from '@/src/lib/space-scope';

// Memoized so feed rows don't re-render when unrelated screen state changes.
// Props are primitives/stable refs so the memo holds.
const ProfileFeedRow = React.memo(function ProfileFeedRow({
  memory,
  isLast,
}: {
  memory: any;
  isLast: boolean;
}) {
  return <MemoryPost memory={memory} variant="feed" isLast={isLast} />;
});

export default function MemberProfileScreen() {
  return (
    <FeatureRouteGuard featureId="memoryFeed">
      <MemberProfileScreenInner />
    </FeatureRouteGuard>
  );
}

function MemberProfileScreenInner() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const session = useSession() as any;
  const fallbackSpaceId = session?.activeCouple?.couple?.id ?? session?.space?.id;
  const isOwnProfile = !!userId && userId === session?.user?.id;
  const profileSpaceIds = uniqueSpaceIds(
    isOwnProfile
      ? [session?.personalSpaceId ?? fallbackSpaceId, session?.sharedSpaceId ?? fallbackSpaceId]
      : [session?.sharedSpaceId ?? fallbackSpaceId],
  );
  const { user, membership, memories } = useMemberProfile(
    userId,
    profileSpaceIds,
    session?.personalSpaceId ?? null,
    session?.user?.id ?? null,
  );

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
      <FlashList
        data={memories}
        keyExtractor={(m: any) => m.id}
        renderItem={({ item, index }) => (
          <ProfileFeedRow memory={item} isLast={index === memories.length - 1} />
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
