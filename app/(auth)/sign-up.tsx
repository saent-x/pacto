import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { supabase } from '@/src/lib/supabase';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { Button, Input } from '@/src/components/ui';

export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!displayName.trim()) newErrors.displayName = 'Your name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'At least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }
    if (data?.user && !data.session) {
      Alert.alert(
        'Check your email',
        'We sent a confirmation link to ' + email.trim() + '. Tap it, then come back and sign in.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={20} color={Colors.cream} />
              </TouchableOpacity>
            </Animated.View>

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(700).delay(150)} style={styles.header}>
              <Text style={styles.title}>Create{'\n'}account</Text>
              <View style={styles.goldRule} />
              <Text style={styles.subtitle}>
                The first step toward your shared rhythm.
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.duration(600).delay(350)} style={styles.form}>
              <Input
                label="Name"
                placeholder="What should we call you?"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                error={errors.displayName}
                leftIcon={<Feather name="user" size={16} color={Colors.fog} />}
              />
              <Input
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
                leftIcon={<Feather name="at-sign" size={16} color={Colors.fog} />}
              />
              <Input
                label="Password"
                placeholder="6+ characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                error={errors.password}
                leftIcon={<Feather name="lock" size={16} color={Colors.fog} />}
                rightIcon={
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={Colors.fog}
                  />
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
                size="lg"
                style={styles.submitBtn}
              />
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.footer}>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={styles.footerText}>
                  Already have an account? <Text style={styles.footerLink}>Sign in</Text>
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
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },

  backBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginBottom: Spacing['4xl'],
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.cream,
    fontSize: 38,
  },
  goldRule: {
    width: 24,
    height: 2,
    backgroundColor: Colors.primary,
    marginVertical: Spacing.xl,
    borderRadius: 1,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.fog,
  },

  form: {
    gap: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
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
    color: Colors.fog,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: '500',
  },
});
