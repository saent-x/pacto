import { StyleSheet, Text, View } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { usePollVote } from '@/src/hooks/memories/usePollVote';

interface Option {
  id: string;
  label: string;
  voteCount?: number;
  votes?: { id: string; user?: { id: string } }[];
}

interface Props {
  pollId: string;
  question?: string;
  options: Option[];
  currentUserId?: string;
}

export function MemoryPoll({ question, options, currentUserId }: Props) {
  const { C } = useTheme();
  const { cast, revoke } = usePollVote();
  const totalVotes = options.reduce((sum, o) => sum + (o.voteCount ?? o.votes?.length ?? 0), 0);
  const myVote = options
    .flatMap((o) => (o.votes ?? []).map((v) => ({ optionId: o.id, voteId: v.id, userId: v.user?.id })))
    .find((v) => v.userId === currentUserId);

  return (
    <View style={styles.wrap}>
      {question ? <Text style={[Typography.body, { color: C.inkColor, marginBottom: 8, fontWeight: '600' }]}>{question}</Text> : null}
      {options.map((o) => {
        const votes = o.voteCount ?? o.votes?.length ?? 0;
        const pct = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
        const mine = myVote?.optionId === o.id;
        return (
          <PressScale
            key={o.id}
            onPress={() => (mine && myVote ? revoke(myVote.voteId!) : cast(o.id))}
            style={[styles.option, { borderColor: mine ? C.accent : C.ink3 }]}
          >
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: C.accent + '22' }]} />
            <Text style={[Typography.body, { color: C.inkColor }]}>{o.label}</Text>
            <Text style={[Typography.caption, { color: C.ink3, marginLeft: 'auto' }]}>{pct}%</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  option: { position: 'relative', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
