import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Button, Input } from '@/src/components/ui';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { useSession } from '@/src/hooks/useSession';
import { generateCoupleKey, storeCoupleKey } from '@/src/lib/crypto';

type Step = 'choose' | 'create' | 'created';

export default function OnboardingScreen() {
  const C = useColors();
  const router = useRouter();
  const { createCouple } = useAuthActions();
  const { activeCouple, route } = useSession();

  const [step, setStep] = useState<Step>('choose');
  const [coupleName, setCoupleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!coupleName.trim()) {
      Alert.alert('Oops', 'Give your couple a name first');
      return;
    }
    try {
      setLoading(true);
      const result = await createCouple({
        name: coupleName.trim(),
      });
      setInviteCode(result.inviteCode);

      // Auto-generate encryption key for the new couple
      try {
        const coupleId = result.couple._id;
        const keyBase64 = await generateCoupleKey();
        await storeCoupleKey(coupleId, keyBase64);
      } catch {
        // Non-fatal — encryption can be set up later from settings
      }

      setStep('created');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Unable to create your couple.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = async () => {
    if (activeCouple && route) {
      router.replace(route);
    }
  };

  // ── Choose ──
  if (step === 'choose') {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(700)} style={styles.chooseHeader}>
              <Text style={[styles.chooseTitle, { color: C.cream }]}>
                Let's get you{'\n'}two connected
              </Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
              <Text style={[styles.chooseSubtitle, { color: C.fog }]}>
                Create a shared space or join your partner who's already waiting.
              </Text>
            </Animated.View>

            <View style={styles.options}>
              <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: C.card, borderColor: C.border }]}
                  activeOpacity={0.85}
                  onPress={() => setStep('create')}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionIcon, { backgroundColor: C.primaryMuted }]}>
                      <Feather name="plus" size={20} color={C.primary} />
                    </View>
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, { color: C.cream }]}>Create a Couple</Text>
                    <Text style={[styles.optionDesc, { color: C.fog }]}>Start fresh and invite your partner</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={C.dusk} />
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(450)}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: C.card, borderColor: C.border }]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(auth)/invite')}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionIcon, styles.optionIconAlt, { backgroundColor: C.infoLight }]}>
                      <Feather name="link-2" size={20} color={C.info} />
                    </View>
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, { color: C.cream }]}>Join Your Partner</Text>
                    <Text style={[styles.optionDesc, { color: C.fog }]}>Enter the code they shared with you</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={C.dusk} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Create ──
  if (step === 'create') {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity onPress={() => setStep('choose')} style={[styles.backBtn, { backgroundColor: C.dim }]} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color={C.cream} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.createHeader}>
              <Text style={[styles.createTitle, { color: C.cream }]}>Name your couple</Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
              <Text style={[styles.createSubtitle, { color: C.fog }]}>
                Something just for you two.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.createForm}>
              <Input
                placeholder='e.g. "Tor & Emma"'
                value={coupleName}
                onChangeText={setCoupleName}
                autoFocus
                leftIcon={<Feather name="heart" size={16} color={C.fog} />}
              />
              <Button
                title="Create"
                onPress={handleCreate}
                loading={loading}
                size="lg"
                disabled={!coupleName.trim()}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Created ──
  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.scroll, styles.centeredScroll]} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.successHeader}>
            <View style={[styles.successRing, { borderColor: C.success, backgroundColor: C.successLight }]}>
              <Feather name="check" size={24} color={C.success} />
            </View>
            <Text style={[styles.successTitle, { color: C.cream }]}>You're all set</Text>
            <Text style={[styles.successSubtitle, { color: C.fog }]}>
              Share this code with your partner.
            </Text>
          </Animated.View>

          <Animated.View entering={SlideInRight.duration(600).delay(300)}>
            <TouchableOpacity
              onPress={handleCopyCode}
              activeOpacity={0.9}
              style={[styles.codeCard, { backgroundColor: C.dim, borderColor: C.dusk }]}
            >
              <Text style={[styles.codeLabel, { color: C.fog }]}>Invite Code</Text>
              <Text style={[styles.codeValue, { color: C.cream }]}>{inviteCode}</Text>
              <View style={[styles.codeCopyRow, { backgroundColor: C.muted }]}>
                <Feather name={copied ? 'check' : 'copy'} size={12} color={C.fog} />
                <Text style={[styles.codeCopyText, { color: C.fog }]}>{copied ? 'Copied' : 'Tap to copy'}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.successFooter}>
            <Text style={[styles.noteText, { color: C.fog }]}>
              You can start now. Your partner can join anytime.
            </Text>
            <Button
              title={activeCouple && route ? "Let's Go" : 'Syncing your space...'}
              onPress={handleDone}
              size="lg"
              style={styles.goBtn}
              disabled={!activeCouple || !route}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['4xl'] },
  centeredScroll: { justifyContent: 'center' },

  goldRule: { width: 24, height: 2, marginVertical: Spacing.xl, borderRadius: 1 },

  // Choose
  chooseHeader: { marginTop: Spacing['5xl'], marginBottom: Spacing['4xl'] },
  chooseTitle: { ...Typography.largeTitle },
  chooseSubtitle: { ...Typography.body },
  options: { gap: Spacing.lg },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  optionLeft: { marginRight: Spacing.lg },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconAlt: {},
  optionBody: { flex: 1 },
  optionTitle: { ...Typography.subheading, marginBottom: 2 },
  optionDesc: { ...Typography.caption },

  // Create
  backBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  createHeader: { marginBottom: Spacing['3xl'] },
  createTitle: { ...Typography.title },
  createSubtitle: { ...Typography.body },
  createForm: { gap: Spacing['2xl'] },

  // Created
  successHeader: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  successRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: { ...Typography.title },
  successSubtitle: { ...Typography.body, textAlign: 'center', marginTop: Spacing.sm },
  codeCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  codeLabel: { ...Typography.overline, marginBottom: Spacing.lg },
  codeValue: { ...Typography.mono, fontSize: 34, fontWeight: '700', letterSpacing: 6, lineHeight: 42 },
  codeCopyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  codeCopyText: { ...Typography.small },
  successFooter: { alignItems: 'center', gap: Spacing.xl },
  noteText: { ...Typography.caption, textAlign: 'center' },
  goBtn: { width: '100%' },
});
