import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/src/components/ui/pacto/Avatar';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

interface Props {
  meDisplayName?: string | null;
  meAvatarUrl?: string | null;
  isSolo: boolean;
}

/**
 * Inline composer rail at the top of the feed. Mirrors the design's `Composer`:
 * a row with the user's avatar, a faux input ("what's the latest?"), and a
 * solid Post button. Tapping anywhere in the rail opens the existing memory
 * composer sheet.
 */
export function ComposerRail({ meDisplayName, meAvatarUrl, isSolo }: Props) {
  const { C } = useTheme();
  const initial = (meDisplayName ?? '?').charAt(0).toUpperCase();
  const placeholder = isSolo ? 'remember something…' : "what's the latest?";

  const open = () => router.push('/sheets/memory-composer' as any);

  return (
    <View style={styles.row}>
      <Avatar
        person={{ initial, color: C.accent, avatarUrl: meAvatarUrl ?? undefined }}
        size={36}
      />
      <PressScale onPress={open} style={styles.fauxInput}>
        <Text style={[Typography.body, { color: C.ink3, fontSize: 15 }]} numberOfLines={1}>
          {placeholder}
        </Text>
      </PressScale>
      <PressScale
        onPress={open}
        style={[styles.postBtn, { backgroundColor: C.inkColor, borderColor: C.inkColor }]}
      >
        <Text style={[styles.postLabel, { color: C.bg }]}>Post</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
    gap: 12,
  },
  fauxInput: {
    flex: 1,
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  postLabel: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
});
