import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { MemoryAttachments } from './MemoryAttachments';

interface Props {
  quotedMemoryId: string;
  authorName: string;
  body: string;
  attachments?: { id: string; type: string; mediaUrl?: string }[];
}

export function MemoryQuoteEmbed({ quotedMemoryId, authorName, body, attachments }: Props) {
  const { C } = useTheme();
  return (
    <PressScale
      onPress={() => router.push(`/(tabs)/memories/${quotedMemoryId}` as any)}
      style={[styles.box, { borderColor: C.ink3 }]}
    >
      <Text style={[Typography.caption, { color: C.ink3, marginBottom: 4 }]}>{authorName}</Text>
      <Text style={[Typography.body, { color: C.inkColor }]}>{body}</Text>
      {attachments ? <MemoryAttachments attachments={attachments as any} /> : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
});
