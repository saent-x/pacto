import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { useEncryption } from '@/src/hooks/useEncryption';
import { getCoupleKey } from '@/src/lib/crypto';
import { Typography } from '@/src/constants/typography';
import { Spacing, BorderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';
import { QRCode } from '@/src/components/ui/QRCode';

type Mode = 'choose' | 'show' | 'scan' | 'done';

export default function KeyExchangeScreen() {
  const C = useColors();
  const { mode: themeMode } = useTheme();
  const router = useRouter();
  const { activeCouple } = useSession();
  const { hasKey, initializeKey, importPartnerKey } = useEncryption();
  const coupleId = activeCouple?.couple?._id ?? null;

  const [mode, setMode] = useState<Mode>('choose');
  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const glassBg = themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
  const glassBorder = themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)';

  // Load existing key on mount
  useEffect(() => {
    if (coupleId) {
      getCoupleKey(coupleId).then((key) => {
        if (key) setKeyValue(key);
      });
    }
  }, [coupleId]);

  const handleGenerateKey = useCallback(async () => {
    try {
      const key = await initializeKey();
      setKeyValue(key);
      setMode('show');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to generate encryption key.');
    }
  }, [initializeKey]);

  const handleShowKey = useCallback(() => {
    if (keyValue) {
      setMode('show');
    } else {
      handleGenerateKey();
    }
  }, [keyValue, handleGenerateKey]);

  const handleStartScan = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Required', 'Allow camera access to scan your partner\'s encryption key.');
        return;
      }
    }
    setScanned(false);
    setMode('scan');
  }, [permission, requestPermission]);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Expect format: COUPL_KEY:base64data
    const prefix = 'COUPL_KEY:';
    if (!data.startsWith(prefix)) {
      Alert.alert('Invalid QR', 'This doesn\'t look like a Coupl encryption key.');
      setScanned(false);
      return;
    }

    const keyBase64 = data.slice(prefix.length);
    try {
      await importPartnerKey(keyBase64);
      setKeyValue(keyBase64);
      setMode('done');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to import key.');
      setScanned(false);
    }
  }, [scanned, importPartnerKey]);

  const handleCopyKey = useCallback(async () => {
    if (!keyValue) return;
    Alert.alert(
      'Copy encryption key?',
      'The key will be on your clipboard, which other apps can read. QR scanning is more secure. Only use this if QR isn\'t possible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy Anyway',
          onPress: async () => {
            await Clipboard.setStringAsync(`COUPL_KEY:${keyValue}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [keyValue]);

  const handlePasteKey = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    const prefix = 'COUPL_KEY:';
    if (!text.startsWith(prefix)) {
      Alert.alert('Invalid Key', 'Paste the key your partner shared (starts with COUPL_KEY:).');
      return;
    }
    const keyBase64 = text.slice(prefix.length);
    try {
      await importPartnerKey(keyBase64);
      setKeyValue(keyBase64);
      setMode('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to import key.');
    }
  }, [importPartnerKey]);

  // ── Done ──
  if (mode === 'done') {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.centerWrap}>
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.doneRing, { borderColor: C.success, backgroundColor: C.successLight }]}>
            <Feather name="lock" size={28} color={C.success} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.duration(400).delay(200)} style={[styles.doneTitle, { color: C.text }]}>
            Encryption active
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(400).delay(350)} style={[styles.doneSub, { color: C.textSecondary }]}>
            Journal entries, love notes, and check-in notes{'\n'}are now end-to-end encrypted.
          </Animated.Text>
          <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.doneBtn}>
            <Button title="Done" onPress={() => router.back()} size="lg" style={{ width: '100%' }} />
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // ── QR Scanner ──
  if (mode === 'scan') {
    return (
      <View style={[styles.screen, { backgroundColor: C.ink }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.scanHeader}>
            <TouchableOpacity onPress={() => setMode('choose')} style={styles.scanBackBtn}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scanTitle}>Scan partner's key</Text>
            <View style={styles.scanBackBtn} />
          </View>
          <View style={styles.scanArea}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.scanOverlay}>
              <View style={[styles.scanFrame, { borderColor: C.primary }]} />
            </View>
          </View>
          <View style={styles.scanFooter}>
            <Text style={[styles.scanHint, { color: C.haze }]}>
              Point at the QR code on your partner's screen
            </Text>
            <TouchableOpacity onPress={handlePasteKey} style={[styles.pasteBtn, { borderColor: C.dusk }]}>
              <Feather name="clipboard" size={14} color={C.haze} />
              <Text style={[styles.pasteBtnText, { color: C.haze }]}>Paste from clipboard</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Show QR ──
  if (mode === 'show' && keyValue) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={() => setMode('choose')} style={styles.backBtn} hitSlop={10}>
              <Feather name="chevron-left" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: C.text }]}>Your Key</Text>
            <View style={styles.backBtn} />
          </View>
          <ScrollView contentContainerStyle={styles.showContent} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(500)} style={styles.qrWrap}>
              <QRCode
                value={`COUPL_KEY:${keyValue}`}
                size={220}
                fgColor={themeMode === 'dark' ? C.cream : C.ink}
                bgColor={themeMode === 'dark' ? C.dim : C.white}
              />
            </Animated.View>
            <Animated.Text entering={FadeInDown.duration(400).delay(200)} style={[styles.showHint, { color: C.textSecondary }]}>
              Have your partner scan this QR code{'\n'}to share your encryption key.
            </Animated.Text>
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <TouchableOpacity onPress={handleCopyKey} style={[styles.copyBtn, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                <Feather name="copy" size={16} color={C.primary} />
                <Text style={[styles.copyBtnText, { color: C.primary }]}>Copy key to clipboard</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Choose ──
  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Feather name="chevron-left" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Encryption</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: hasKey ? C.successLight : C.primaryMuted }]}>
              <Feather name={hasKey ? 'lock' : 'shield'} size={28} color={hasKey ? C.success : C.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: C.text }]}>
              {hasKey ? 'Encryption is active' : 'End-to-end encryption'}
            </Text>
            <Text style={[styles.heroSub, { color: C.textSecondary }]}>
              {hasKey
                ? 'Your sensitive data is encrypted. Only you and your partner can read it.'
                : 'Encrypt journal entries, love notes, and check-in notes so only you and your partner can read them.'}
            </Text>
          </Animated.View>

          {!hasKey && (
            <>
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
                  activeOpacity={0.7}
                  onPress={handleGenerateKey}
                >
                  <View style={[styles.optionIcon, { backgroundColor: C.primaryMuted }]}>
                    <Feather name="key" size={18} color={C.primary} />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, { color: C.text }]}>Generate key</Text>
                    <Text style={[styles.optionSub, { color: C.textTertiary }]}>Create a new encryption key and share it via QR</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
                  activeOpacity={0.7}
                  onPress={handleStartScan}
                >
                  <View style={[styles.optionIcon, { backgroundColor: C.infoLight }]}>
                    <Feather name="camera" size={18} color={C.info} />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, { color: C.text }]}>Scan partner's key</Text>
                    <Text style={[styles.optionSub, { color: C.textTertiary }]}>Scan a QR code from your partner's device</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </Animated.View>
            </>
          )}

          {hasKey && (
            <>
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
                  activeOpacity={0.7}
                  onPress={handleShowKey}
                >
                  <View style={[styles.optionIcon, { backgroundColor: C.primaryMuted }]}>
                    <Feather name="share-2" size={18} color={C.primary} />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionTitle, { color: C.text }]}>Share key with partner</Text>
                    <Text style={[styles.optionSub, { color: C.textTertiary }]}>Show QR code for your partner to scan</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.subheading },

  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 120, gap: Spacing.md },

  hero: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.md },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  heroTitle: { ...Typography.heading, textAlign: 'center' },
  heroSub: { ...Typography.body, textAlign: 'center', maxWidth: 300, lineHeight: 22 },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { ...Typography.captionMedium, fontSize: 15 },
  optionSub: { ...Typography.small },

  // Show QR
  showContent: { alignItems: 'center', paddingTop: Spacing['3xl'], paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.xl },
  qrWrap: {
    padding: Spacing.xl, borderRadius: BorderRadius.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  showHint: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, borderWidth: StyleSheet.hairlineWidth,
  },
  copyBtnText: { ...Typography.captionMedium },

  // Scanner
  scanHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  scanBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { ...Typography.subheading, color: '#fff' },
  scanArea: { flex: 1, position: 'relative' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderRadius: 16 },
  scanFooter: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.lg },
  scanHint: { ...Typography.caption, textAlign: 'center' },
  pasteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: StyleSheet.hairlineWidth,
  },
  pasteBtnText: { ...Typography.small },

  // Done
  doneRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'] },
  doneTitle: { ...Typography.title, marginBottom: Spacing.md },
  doneSub: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  doneBtn: { width: '100%', marginTop: Spacing['4xl'] },
});
