import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/src/hooks/useColors';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { useSession } from '@/src/hooks/useSession';

const CODE_LENGTH = 8;

export default function InviteScreen() {
  const C = useColors();
  const router = useRouter();
  const { joinCoupleByInviteCode } = useAuthActions();
  const { activeCouple, route } = useSession();

  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fullCode = code.join('');

  const handleCharChange = (text: string, index: number) => {
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char) return;
    const newCode = [...code];
    newCode[index] = char.charAt(0);
    setCode(newCode);
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (code[index]) {
        const newCode = [...code]; newCode[index] = ''; setCode(newCode);
      } else if (index > 0) {
        const newCode = [...code]; newCode[index - 1] = ''; setCode(newCode);
        inputRefs.current[index - 1]?.focus(); setActiveIndex(index - 1);
      }
    }
  };

  const handleJoin = async () => {
    if (fullCode.length !== CODE_LENGTH) return;
    try {
      setLoading(true);
      await joinCoupleByInviteCode(fullCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJoined(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid code', 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
        <SafeAreaView style={styles.successWrap}>
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.successRing, { borderColor: C.primary, backgroundColor: C.primaryMuted }]}>
            <Feather name="heart" size={32} color={C.primary} />
          </Animated.View>
          <Animated.Text entering={FadeInUp.duration(500).delay(300)} style={[styles.successTitle, { color: C.cream }]}>
            Connected
          </Animated.Text>
          <Animated.Text entering={FadeInUp.duration(500).delay(450)} style={[styles.successSub, { color: C.fog }]}>
            Your shared space is ready.{'\n'}Everything here, you do together.
          </Animated.Text>
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.successBtn}>
            <Button
              title="Begin"
              onPress={() => {
                if (activeCouple && route) {
                  router.replace(route);
                }
              }}
              size="lg"
              style={{ width: '100%' }}
              disabled={!activeCouple || !route}
            />
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.screenBackground }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.dim }]} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color={C.cream} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
              <Text style={[styles.title, { color: C.cream }]}>Enter invite code</Text>
              <View style={[styles.goldRule, { backgroundColor: C.primary }]} />
              <Text style={[styles.subtitle, { color: C.fog }]}>
                The 8-character code your partner shared.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.codeRow}>
              {code.map((char, index) => (
                <View key={index} style={styles.charWrap}>
                  <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.charInput,
                      { borderColor: C.dusk, backgroundColor: C.dark, color: C.cream },
                      activeIndex === index && { borderColor: C.primary, backgroundColor: C.primaryMuted },
                      char && { borderColor: C.muted, backgroundColor: C.dim },
                    ]}
                    value={char}
                    onChangeText={(t) => handleCharChange(t, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    onFocus={() => setActiveIndex(index)}
                    maxLength={1}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                  {index === 3 && <View style={[styles.codeDash, { backgroundColor: C.dusk }]} />}
                </View>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.footer}>
              <Button
                title="Join"
                onPress={handleJoin}
                loading={loading}
                size="lg"
                disabled={fullCode.length !== CODE_LENGTH}
                style={{ width: '100%' }}
              />
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing['2xl'] },

  backBtn: {
    marginTop: Spacing.lg, marginBottom: Spacing['2xl'],
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  goldRule: { width: 24, height: 2, marginVertical: Spacing.xl, borderRadius: 1 },

  header: { alignItems: 'center', marginBottom: Spacing['4xl'] },
  title: { ...Typography.title, textAlign: 'center' },
  subtitle: { ...Typography.caption, textAlign: 'center' },

  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing['4xl'] },
  charWrap: { flexDirection: 'row', alignItems: 'center' },
  charInput: {
    width: 36, height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 17, fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New' }),
  },
  codeDash: { width: 8, height: 1.5, borderRadius: 1, marginLeft: Spacing.sm },

  footer: { marginTop: 'auto', paddingBottom: Spacing['3xl'] },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  successRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  successTitle: { ...Typography.title, marginBottom: Spacing.md },
  successSub: { ...Typography.body, textAlign: 'center' },
  successBtn: { width: '100%', marginTop: Spacing['4xl'] },
});
