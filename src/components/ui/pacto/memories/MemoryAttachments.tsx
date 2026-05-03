import { Image, StyleSheet, View } from 'react-native';
import { EntityRefCard } from './EntityRefCard';

interface Attachment {
  id: string;
  type: string;
  refId?: string;
  mediaUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
}

export function MemoryAttachments({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {attachments.map((a) => {
        if (a.type === 'image' || a.type === 'gif') {
          const aspect = a.mediaWidth && a.mediaHeight ? a.mediaWidth / a.mediaHeight : 1;
          return <Image key={a.id} source={{ uri: a.mediaUrl }} style={[styles.media, { aspectRatio: aspect }]} resizeMode="cover" />;
        }
        if (a.type === 'video') {
          return <Image key={a.id} source={{ uri: a.mediaUrl }} style={[styles.media, { aspectRatio: 16 / 9 }]} resizeMode="cover" />;
        }
        return <EntityRefCard key={a.id} type={a.type as any} refId={a.refId!} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  media: { width: '100%', borderRadius: 12, backgroundColor: '#eee' },
});
