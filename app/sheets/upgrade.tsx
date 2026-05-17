import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { PLAN_LIMITS } from '@/src/lib/plan';

const SUPPORT_EMAIL = 'support@pacto.app';

export default function UpgradeSheet() {
  const { C } = useTheme();
  const free = PLAN_LIMITS.free;
  const pro = PLAN_LIMITS.pro;

  async function requestUpgrade() {
    const subject = encodeURIComponent('Pacto Pro access');
    const body = encodeURIComponent('Hi Pacto team,\n\nI would like to enable Pro for my space.');
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Could not open email', `Contact ${SUPPORT_EMAIL} to request Pro access.`);
      return;
    }
    await Linking.openURL(url);
    router.back();
  }

  return (
    <SheetShell eyebrow="PACTO PRO" eyebrowColor={C.accent3} title="Upgrade">
      <Card style={[styles.hero, { backgroundColor: C.accentSoft, borderColor: C.accent }]}>
        <View style={[styles.heroIcon, { backgroundColor: C.accent }]}>
          <Icon name="sparkle" size={20} color={C.peachInk} strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>More room for the pact</Text>
          <Text style={[Typography.caption, { color: C.ink2, marginTop: 4, lineHeight: 18 }]}>
            Pro increases storage and unlocks higher-capacity shared spaces. Billing is handled by the Pacto team for this build.
          </Text>
        </View>
      </Card>

      <Card padded={false}>
        <View style={[styles.tableHead, { borderBottomColor: C.lineColor }]}>
          <Text style={[Typography.eyebrowSm, { color: C.ink3, flex: 1 }]}>Feature</Text>
          <Text style={[Typography.eyebrowSm, { color: C.ink3, width: 72, textAlign: 'right' }]}>Free</Text>
          <Text style={[Typography.eyebrowSm, { color: C.accent, width: 72, textAlign: 'right' }]}>Pro</Text>
        </View>
        <Row label="Media storage" free={`${(free.mediaQuotaBytes / 1024 / 1024).toFixed(0)} MB`} pro={`${(pro.mediaQuotaBytes / 1024 / 1024 / 1024).toFixed(0)} GB`} />
        <Row label="Video uploads" free={free.videoUploads ? 'Yes' : 'No'} pro={pro.videoUploads ? 'Yes' : 'No'} />
        <Row label="AI turns / month" free={String(free.aiTurnsPerMonth)} pro={String(pro.aiTurnsPerMonth)} />
        <Row label="Voice assistant" free={free.voiceAssistant ? 'Yes' : 'No'} pro={pro.voiceAssistant ? 'Yes' : 'No'} />
        <Row label="Crew members" free={String(free.crewMaxMembers)} pro={String(pro.crewMaxMembers)} />
        <Row label="Themes" free={free.themes ? 'Yes' : 'No'} pro={pro.themes ? 'Yes' : 'No'} />
        <Row label="Export archive" free={free.exportArchive ? 'Yes' : 'No'} pro={pro.exportArchive ? 'Yes' : 'No'} />
      </Card>

      <PressScale
        testID="upgrade-request-pro"
        onPress={requestUpgrade}
        style={[styles.cta, { backgroundColor: C.accent }]}
      >
        <Text style={[Typography.body, { color: C.bg, fontWeight: '600' }]}>Request Pro access</Text>
      </PressScale>

      <PressScale
        testID="upgrade-close"
        onPress={() => router.back()}
        style={styles.secondaryCta}
      >
        <Text style={[Typography.captionMedium, { color: C.ink2 }]}>Not now</Text>
      </PressScale>
    </SheetShell>
  );
}

function Row({ label, free, pro }: { label: string; free: string; pro: string }) {
  const { C } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: C.lineColor }]}>
      <Text style={[Typography.body, { color: C.inkColor, flex: 1 }]}>{label}</Text>
      <Text style={[Typography.body, { color: C.ink3, width: 72, textAlign: 'right' }]}>{free}</Text>
      <Text style={[Typography.bodyMedium, { color: C.inkColor, width: 72, textAlign: 'right' }]}>{pro}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cta: { marginTop: 24, paddingVertical: 14, alignItems: 'center', borderRadius: 18 },
  secondaryCta: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
});
