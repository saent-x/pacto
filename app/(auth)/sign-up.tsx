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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { Button, Input } from '@/src/components/ui';
import { useAuthActions } from '@/src/hooks/useAuthActions';

export default function SignUpScreen() {
  const C = useColors();
  const router = useRouter();
  const { signUp } = useAuthActions();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const compact = height < 820;

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your name, email, and password.');
      return;
    }

    try {
      setLoading(true);
      await signUp({
        name,
        email,
        password,
      });
      // Navigate immediately — don't wait for reactive auth state to settle.
      router.replace('/(auth)/onboarding');
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Sign up failed',
        error instanceof Error ? error.message : 'Unable to create your account.',
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
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
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backBtn, compact ? styles.backBtnCompact : undefined, { backgroundColor: C.dim }]}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={20} color={C.cream} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(700).delay(150)}
              style={[styles.header, compact ? styles.headerCompact : undefined]}
            >
              <Text style={[styles.title, compact ? styles.titleCompact : undefined, { color: C.cream }]}>
                Create account
              </Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
              <Text style={[styles.subtitle, { color: C.fog }]}>
                The first step toward your shared rhythm.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(600).delay(350)}
              style={[styles.form, compact ? styles.formCompact : undefined]}
            >
              <View style={[styles.noticeCard, compact ? styles.noticeCardCompact : undefined, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={[styles.noticeIcon, { backgroundColor: C.primaryMuted }]}>
                  <Feather name="user-plus" size={18} color={C.primary} />
                </View>
                <View style={styles.noticeBody}>
                  <Text style={[styles.noticeTitle, { color: C.cream }]}>Email and password</Text>
                  <Text style={[styles.noticeCopy, { color: C.fog }]}>
                    Create your account here, then continue straight into couple
                    setup.
                  </Text>
                </View>
              </View>

              <View style={[styles.fieldGroup, compact ? styles.fieldGroupCompact : undefined]}>
                <Input
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="How should we address you?"
                  autoCapitalize="words"
                  textContentType="name"
                  returnKeyType="next"
                  leftIcon={<Feather name="user" size={16} color={C.fog} />}
                />
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
                  placeholder="Create a password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="done"
                  leftIcon={<Feather name="lock" size={16} color={C.fog} />}
                />
              </View>

              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
                size="lg"
                style={styles.submitBtn}
                disabled={!name.trim() || !email.trim() || !password}
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.footer}>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={[styles.footerText, { color: C.fog }]}>
                  Already have an account? <Text style={{ color: C.primary, fontWeight: '500' }}>Sign in</Text>
                </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.sm,
  },
  scrollContentCompact: {
    paddingTop: 0,
  },

  backBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCompact: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  header: {
    marginBottom: Spacing['3xl'],
  },
  headerCompact: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    ...Typography.largeTitle,
    fontSize: 38,
  },
  titleCompact: {
    fontSize: 32,
  },
  goldRule: {
    width: 24,
    height: 2,
    marginVertical: Spacing.xl,
    borderRadius: 1,
  },
  subtitle: {
    ...Typography.body,
  },

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
  submitBtn: {
    marginTop: Spacing.sm,
  },

  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
  },
});
