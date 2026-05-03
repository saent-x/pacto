import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { PLAN_LIMITS } from '@/src/lib/plan';

export default function UpgradeSheet() {
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const free = PLAN_LIMITS.free;
  const pro = PLAN_LIMITS.pro;

  return (
    <ScrollView style={[styles.root, { backgroundColor: C.bg }]} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24 }}>
      <Text style={[Typography.title, { color: C.inkColor, marginBottom: 16 }]}>Upgrade to Pro</Text>

      <Row label="Media storage" free={`${(free.mediaQuotaBytes / 1024 / 1024).toFixed(0)} MB`} pro={`${(pro.mediaQuotaBytes / 1024 / 1024 / 1024).toFixed(0)} GB`} />
      <Row label="Video uploads" free={free.videoUploads ? 'Yes' : 'No'} pro={pro.videoUploads ? 'Yes' : 'No'} />
      <Row label="AI turns / month" free={String(free.aiTurnsPerMonth)} pro={String(pro.aiTurnsPerMonth)} />
      <Row label="Voice assistant" free={free.voiceAssistant ? 'Yes' : 'No'} pro={pro.voiceAssistant ? 'Yes' : 'No'} />
      <Row label="Crew members" free={String(free.crewMaxMembers)} pro={String(pro.crewMaxMembers)} />
      <Row label="Themes" free={free.themes ? 'Yes' : 'No'} pro={pro.themes ? 'Yes' : 'No'} />
      <Row label="Export archive" free={free.exportArchive ? 'Yes' : 'No'} pro={pro.exportArchive ? 'Yes' : 'No'} />

      <PressScale
        onPress={() => router.back()}
        style={[styles.cta, { backgroundColor: C.accent }]}
      >
        <Text style={[Typography.body, { color: '#fff', fontWeight: '600' }]}>Upgrade (coming soon)</Text>
      </PressScale>
    </ScrollView>
  );
}

function Row({ label, free, pro }: { label: string; free: string; pro: string }) {
  const { C } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[Typography.body, { color: C.inkColor, flex: 1 }]}>{label}</Text>
      <Text style={[Typography.body, { color: C.ink3, width: 80, textAlign: 'right' }]}>{free}</Text>
      <Text style={[Typography.body, { color: C.inkColor, width: 80, textAlign: 'right', fontWeight: '600' }]}>{pro}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  cta: { marginTop: 24, paddingVertical: 14, alignItems: 'center', borderRadius: 999 },
});
