import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

export type SpaceMode = 'solo' | 'pair' | 'couple' | 'crew';

interface Props {
  mode: SpaceMode;
  reactionCount: number;
  replyCount: number;
  repostCount: number;
  hasReacted?: boolean;
  canReact?: boolean;
  canRepost?: boolean;
  canShare?: boolean;
  onReact?: () => void;
  onReply?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
}

export function MemoryActions({
  mode,
  reactionCount,
  replyCount,
  repostCount,
  hasReacted,
  canReact = true,
  canRepost = true,
  canShare = true,
  onReact,
  onReply,
  onRepost,
  onShare,
}: Props) {
  const { C } = useTheme();
  const isSolo = mode === 'solo';

  return (
    <View style={styles.row}>
      {!isSolo && canReact ? (
        <PressScale onPress={onReact} hitSlop={8} style={styles.action}>
          {/* heartFill not in icon set — use heart for both states; color change distinguishes */}
          <Icon name="heart" size={18} color={hasReacted ? C.accent : C.ink3} />
          {reactionCount > 0 ? <Text style={[Typography.caption, { color: C.ink3, marginLeft: 6 }]}>{reactionCount}</Text> : null}
        </PressScale>
      ) : null}
      <PressScale onPress={onReply} hitSlop={8} style={styles.action}>
        <Icon name="messageCircle" size={18} color={C.ink3} />
        {replyCount > 0 ? <Text style={[Typography.caption, { color: C.ink3, marginLeft: 6 }]}>{replyCount}</Text> : null}
      </PressScale>
      {!isSolo && canRepost ? (
        <PressScale onPress={onRepost} hitSlop={8} style={styles.action}>
          <Icon name="repeat" size={18} color={C.ink3} />
          {repostCount > 0 ? <Text style={[Typography.caption, { color: C.ink3, marginLeft: 6 }]}>{repostCount}</Text> : null}
        </PressScale>
      ) : null}
      {canShare ? (
        <PressScale onPress={onShare} hitSlop={8} style={styles.action}>
          <Icon name="send" size={18} color={C.ink3} />
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 24 },
  action: { flexDirection: 'row', alignItems: 'center' },
});
