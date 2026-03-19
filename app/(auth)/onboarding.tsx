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

import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Button, Input } from '@/src/components/ui';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

type Step = 'choose' | 'create' | 'created';

export default function OnboardingScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

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
    setLoading(true);
    const code = generateCode();
    const { data, error } = await supabase.rpc('create_couple' as any, {
      couple_name: coupleName.trim(),
      code,
    } as any);
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setInviteCode(code);
    setStep('created');
    await fetchProfile();
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = async () => {
    await fetchProfile();
    const profile = useAuthStore.getState().profile;
    if (profile?.couple_id) {
      router.replace('/(tabs)/home');
    }
  };

  // ── Choose ──
  if (step === 'choose') {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(700)} style={styles.chooseHeader}>
              <Text style={styles.chooseTitle}>
                Let's get you{'\n'}two connected
              </Text>
              <View style={styles.goldRule} />
              <Text style={styles.chooseSubtitle}>
                Create a shared space or join your partner who's already waiting.
              </Text>
            </Animated.View>

            <View style={styles.options}>
              <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                <TouchableOpacity style={styles.optionCard} activeOpacity={0.85} onPress={() => setStep('create')}>
                  <View style={styles.optionLeft}>
                    <View style={styles.optionIcon}>
                      <Feather name="plus" size={20} color={Colors.primary} />
                    </View>
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>Create a Couple</Text>
                    <Text style={styles.optionDesc}>Start fresh and invite your partner</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.dusk} />
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(450)}>
                <TouchableOpacity style={styles.optionCard} activeOpacity={0.85} onPress={() => router.push('/(auth)/invite')}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionIcon, styles.optionIconAlt]}>
                      <Feather name="link-2" size={20} color={Colors.info} />
                    </View>
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>Join Your Partner</Text>
                    <Text style={styles.optionDesc}>Enter the code they shared with you</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.dusk} />
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
      <View style={styles.screen}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity onPress={() => setStep('choose')} style={styles.backBtn} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color={Colors.cream} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.createHeader}>
              <Text style={styles.createTitle}>Name your couple</Text>
              <View style={styles.goldRule} />
              <Text style={styles.createSubtitle}>
                Something just for you two.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.createForm}>
              <Input
                placeholder='e.g. "Tor & Emma"'
                value={coupleName}
                onChangeText={setCoupleName}
                autoFocus
                leftIcon={<Feather name="heart" size={16} color={Colors.fog} />}
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
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.scroll, styles.centeredScroll]} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.successHeader}>
            <View style={styles.successRing}>
              <Feather name="check" size={24} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>You're all set</Text>
            <Text style={styles.successSubtitle}>
              Share this code with your partner.
            </Text>
          </Animated.View>

          <Animated.View entering={SlideInRight.duration(600).delay(300)}>
            <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.9} style={styles.codeCard}>
              <Text style={styles.codeLabel}>Invite Code</Text>
              <Text style={styles.codeValue}>{inviteCode}</Text>
              <View style={styles.codeCopyRow}>
                <Feather name={copied ? 'check' : 'copy'} size={12} color={Colors.fog} />
                <Text style={styles.codeCopyText}>{copied ? 'Copied' : 'Tap to copy'}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.successFooter}>
            <Text style={styles.noteText}>
              You can start now. Your partner can join anytime.
            </Text>
            <Button title="Let's Go" onPress={handleDone} size="lg" style={styles.goBtn} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['4xl'] },
  centeredScroll: { justifyContent: 'center' },

  goldRule: { width: 24, height: 2, backgroundColor: Colors.primary, marginVertical: Spacing.xl, borderRadius: 1 },

  // Choose
  chooseHeader: { marginTop: Spacing['5xl'], marginBottom: Spacing['4xl'] },
  chooseTitle: { ...Typography.largeTitle, color: Colors.cream },
  chooseSubtitle: { ...Typography.body, color: Colors.fog },
  options: { gap: Spacing.lg },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionLeft: { marginRight: Spacing.lg },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconAlt: { backgroundColor: Colors.infoLight },
  optionBody: { flex: 1 },
  optionTitle: { ...Typography.subheading, color: Colors.cream, marginBottom: 2 },
  optionDesc: { ...Typography.caption, color: Colors.fog },

  // Create
  backBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dim,
    alignItems: 'center', justifyContent: 'center',
  },
  createHeader: { marginBottom: Spacing['3xl'] },
  createTitle: { ...Typography.title, color: Colors.cream },
  createSubtitle: { ...Typography.body, color: Colors.fog },
  createForm: { gap: Spacing['2xl'] },

  // Created
  successHeader: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  successRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1, borderColor: Colors.success,
    backgroundColor: Colors.successLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: { ...Typography.title, color: Colors.cream },
  successSubtitle: { ...Typography.body, color: Colors.fog, textAlign: 'center', marginTop: Spacing.sm },
  codeCard: {
    backgroundColor: Colors.dim,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dusk,
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  codeLabel: { ...Typography.overline, color: Colors.fog, marginBottom: Spacing.lg },
  codeValue: { ...Typography.mono, fontSize: 28, fontWeight: '700', color: Colors.cream, letterSpacing: 6 },
  codeCopyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
  },
  codeCopyText: { ...Typography.small, color: Colors.fog },
  successFooter: { alignItems: 'center', gap: Spacing.xl },
  noteText: { ...Typography.caption, color: Colors.fog, textAlign: 'center' },
  goBtn: { width: '100%' },
});
