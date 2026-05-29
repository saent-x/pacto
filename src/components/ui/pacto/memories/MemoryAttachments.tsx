import { Image, StyleSheet, View } from 'react-native';
import { EntityRefCard } from './EntityRefCard';
import { useTheme } from '@/src/lib/theme';
import { isEntityRefKind, resolveEntityRefScopeId } from '@/src/hooks/memories/useEntityRef';

interface Attachment {
  id: string;
  type: string;
  refId?: string;
  spaceId?: string;
  mediaUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
}

export function MemoryAttachments({
  attachments,
  spaceId,
}: {
  attachments: Attachment[];
  spaceId?: string | null;
}) {
  const { C } = useTheme();
  if (!attachments || attachments.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {attachments.map((a) => {
        if (a.type === 'image' || a.type === 'gif') {
          const aspect = a.mediaWidth && a.mediaHeight ? a.mediaWidth / a.mediaHeight : 1;
          return <Image key={a.id} source={{ uri: a.mediaUrl }} style={[styles.media, { aspectRatio: aspect, backgroundColor: C.bgSoft }]} resizeMode="cover" />;
        }
        if (a.type === 'video') {
          return <Image key={a.id} source={{ uri: a.mediaUrl }} style={[styles.media, { aspectRatio: 16 / 9, backgroundColor: C.bgSoft }]} resizeMode="cover" />;
        }
        if (isEntityRefKind(a.type) && a.refId) {
          return (
            <EntityRefCard
              key={a.id}
              type={a.type}
              refId={a.refId}
              spaceId={resolveEntityRefScopeId(spaceId, a.spaceId)}
            />
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  media: { width: '100%', borderRadius: 12 },
});
