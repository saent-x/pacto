import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressScale } from '@/src/components/ui/PressScale';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useEntityAttachment, type AttachableEntity } from '@/src/hooks/memories/useEntityAttachment';

const TYPES: AttachableEntity[] = ['milestone', 'plan', 'checkIn', 'expense', 'wishlistItem'];
const LABELS: Record<AttachableEntity, string> = {
  milestone: 'Milestones',
  plan: 'Plans',
  checkIn: 'Check-ins',
  expense: 'Expenses',
  wishlistItem: 'Wishlist',
};

export default function MemoryAttachEntitySheet() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const [type, setType] = useState<AttachableEntity>('milestone');
  const { entities } = useEntityAttachment(type);

  return (
    <View style={[styles.root, { backgroundColor: C.bg, paddingTop: insets.top + 12 }]}>
      <Text style={[Typography.title, { color: C.inkColor, paddingHorizontal: 16, paddingBottom: 8 }]}>Attach to memory</Text>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SegmentedControl
          segments={TYPES.map((t) => ({ value: t, label: LABELS[t] }))}
          selected={type}
          onSelect={(v) => setType(v as AttachableEntity)}
        />
      </View>
      <FlatList
        data={entities}
        keyExtractor={(e: any) => e.id}
        renderItem={({ item }: any) => (
          <PressScale
            onPress={() => {
              router.back();
              (router as any).setParams?.({ pickedRefId: item.id, pickedRefType: type });
            }}
            style={[styles.row, { borderColor: C.ink3 }]}
          >
            <Text style={[Typography.body, { color: C.inkColor }]}>{item.title ?? item.name ?? item.body ?? '(untitled)'}</Text>
          </PressScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
