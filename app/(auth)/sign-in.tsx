import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { Button, Input } from '@/src/components/ui';
import { useAuthActions } from '@/src/hooks/useAuthActions';

export default function SignInScreen() {
  const C = useColors();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const compact = height < 780;

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      await signIn({
        email,
        password,
      });
      // Navigate immediately — don't wait for reactive auth state.
      router.replace('/(tabs)/home');
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Sign in failed',
        error instanceof Error ? error.message : 'Unable to sign in.',
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      {/* Warm glow in top-right — a subtle radial feel */}
      <View style={[styles.glowTopRight, { backgroundColor: C.primary }]} />
      <View style={[styles.glowBottomLeft, { backgroundColor: C.primary }]} />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              compact ? styles.scrollContentCompact : undefined,
              { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeIn.duration(1000).delay(200)}
              style={[styles.brand, compact ? styles.brandCompact : undefined]}
            >
              <Text style={[styles.wordmark, compact ? styles.wordmarkCompact : undefined, { color: C.cream }]}>
                Coupl
              </Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(700).delay(600)}>
              <Text style={[styles.tagline, compact ? styles.taglineCompact : undefined, { color: C.haze }]}>
                Your quiet place,{'\n'}together.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(600).delay(900)}
              style={[styles.form, compact ? styles.formCompact : undefined]}
            >
              <View style={[styles.noticeCard, compact ? styles.noticeCardCompact : undefined, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={[styles.noticeIcon, { backgroundColor: C.primaryMuted }]}>
                  <Feather name="shield" size={18} color={C.primary} />
                </View>
                <View style={styles.noticeBody}>
                  <Text style={[styles.noticeTitle, { color: C.cream }]}>Secure sign in</Text>
                  <Text style={[styles.noticeCopy, { color: C.fog }]}>
                    Use your email and password to restore your profile and shared
                    space.
                  </Text>
                </View>
              </View>

              <View style={[styles.fieldGroup, compact ? styles.fieldGroupCompact : undefined]}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  leftIcon={<Feather name="mail" size={16} color={C.fog} />}
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  returnKeyType="done"
                  leftIcon={<Feather name="lock" size={16} color={C.fog} />}
                />
              </View>

              <Button
                title="Sign In"
                onPress={handleSignIn}
                loading={loading}
                size="lg"
                style={styles.signInBtn}
                disabled={!email.trim() || !password}
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(1200)} style={styles.footer}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-up')}
                activeOpacity={0.7}
                style={styles.switchLink}
              >
                <Text style={[styles.switchLabel, { color: C.fog }]}>No account yet?</Text>
                <Text style={[styles.switchAction, { color: C.primary }]}>Create one</Text>
                <Feather name="arrow-right" size={14} color={C.primary} />
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: { flex: 1 },

  // Ambient glows
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.04,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.025,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
  },
  scrollContentCompact: {
    paddingTop: Spacing.sm,
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginTop: Spacing['4xl'],
    marginBottom: Spacing['2xl'],
  },
  brandCompact: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  wordmark: {
    ...Typography.display,
    fontSize: 52,
    lineHeight: 56,
  },
  wordmarkCompact: {
    fontSize: 44,
    lineHeight: 48,
  },
  goldRule: {
    width: 24,
    height: 2,
    marginTop: Spacing.lg,
    borderRadius: 1,
  },

  // Tagline
  tagline: {
    ...Typography.title,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    fontWeight: '300',
  },
  taglineCompact: {
    marginBottom: Spacing['2xl'],
  },

  // Form
  form: {
    gap: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
  formCompact: {
    gap: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.xl,
  },
  fieldGroupCompact: {
    gap: Spacing.lg,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  noticeCardCompact: {
    padding: Spacing.lg,
    borderRadius: 20,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  noticeTitle: {
    ...Typography.subheading,
  },
  noticeCopy: {
    ...Typography.caption,
  },
  signInBtn: {
    marginTop: Spacing.sm,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  switchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  switchLabel: {
    ...Typography.caption,
  },
  switchAction: {
    ...Typography.captionMedium,
  },
});
