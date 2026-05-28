import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { HeaderBrand, PactoMark } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';

const INVITE_CODE_SLOT_SIZE = 52;
const INVITE_CODE_SLOT_RADIUS = 999;
const INVITE_CODE_BUTTON_RADIUS = 999;

export default function InviteCodeScreen() {
  const { C } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = params.code ?? '';
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  async function onCopy() {
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // clipboard unavailable — skip feedback
    }
    if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    setCopied(true);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1800);
  }

  async function onShare() {
    try {
      await Share.share({
        message: `Join me on Pacto. Here's the code: ${code}`,
      });
    } catch {
      // user cancelled or share sheet unavailable
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.hero}>
        <PactoMark size={48} />
        <View style={{ height: 14 }} />
        <HeaderBrand eyebrow="INVITE" title="share the code" size={28} />
        <Text
          style={[
            Typography.body,
            { color: C.ink2, marginTop: 12, textAlign: 'center', maxWidth: 300 },
          ]}
        >
          Send this to whoever's joining your pact. Six characters — case
          doesn't matter.
        </Text>
      </View>

      <View style={styles.codeWrap}>
        <Text
          style={[
            Typography.eyebrow,
            { color: C.ink3, marginBottom: 14, textAlign: 'center' },
          ]}
        >
          Your code
        </Text>
        <View style={styles.slotRow}>
          {code.split('').map((ch, i) => (
            <View
              key={i}
              style={[
                styles.slot,
                { borderColor: C.accent, backgroundColor: C.bgCard },
              ]}
            >
              <Text
                style={{
                  color: C.inkColor,
                  fontFamily: Typography.pixelFont,
                  fontSize: 26,
                }}
              >
                {ch}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <PressScale
          onPress={onCopy}
          style={[styles.btn, { borderColor: C.lineColor, backgroundColor: C.bgCard }]}
        >
          <Icon
            name="copy"
            size={14}
            color={copied ? C.accent : C.ink2}
          />
          <Text
            style={[
              Typography.eyebrowSm,
              { color: copied ? C.accent : C.ink2 },
            ]}
          >
            {copied ? 'COPIED' : 'COPY'}
          </Text>
        </PressScale>
        <PressScale
          onPress={onShare}
          style={[styles.btn, { borderColor: C.lineColor, backgroundColor: C.bgCard }]}
        >
          <Icon name="send" size={14} color={C.ink2} />
          <Text style={[Typography.eyebrowSm, { color: C.ink2 }]}>SHARE</Text>
        </PressScale>
      </View>

      <View style={styles.footer}>
        <PressScale
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home' as any);
          }}
          style={[styles.primary, { backgroundColor: C.inkColor }]}
        >
          <Text style={[Typography.buttonLabel, { color: C.bg }]}>
            I'll do this later
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 36 },
  codeWrap: { marginBottom: 28 },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  slot: {
    width: INVITE_CODE_SLOT_SIZE,
    height: INVITE_CODE_SLOT_SIZE,
    borderWidth: 1.5,
    borderRadius: INVITE_CODE_SLOT_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: INVITE_CODE_BUTTON_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  footer: { marginTop: 'auto', gap: 10 },
  primary: {
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: INVITE_CODE_BUTTON_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
