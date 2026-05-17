import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

interface Props {
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: number;
  onOverflow?: () => void;
}

export function MemoryHeader({ authorId, authorName, authorAvatarUrl, createdAt, onOverflow }: Props) {
  const { C } = useTheme();
  return (
    <View style={styles.row}>
      <PressScale onPress={() => router.push(`/(tabs)/memories/profile/${authorId}` as any)}>
        <Avatar person={{ initial: authorName.charAt(0).toUpperCase(), color: C.accent, avatarUrl: authorAvatarUrl }} size={32} />
      </PressScale>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[Typography.body, { color: C.inkColor, fontWeight: '600' }]}>{authorName}</Text>
        <Text style={[Typography.caption, { color: C.ink3 }]}>{formatDistanceToNowStrict(createdAt)} ago</Text>
      </View>
      {onOverflow ? (
        <PressScale onPress={onOverflow} hitSlop={12}>
          <Icon name="moreH" size={18} color={C.ink3} />
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
});
