import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CouplRings, Display, Overline } from '@/src/components/ui/atoms';
import { GoldRule, BlockCard } from '@/src/components/ui/WarmBlock';
import { Icon } from '@/src/components/ui/Icon';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { createSpace, ensureUserRow } from '@/src/lib/space-actions';

export default function Onboarding() {
  const router = useRouter();
  const { C, F } = useTheme();
  const { user } = useSession();
  const [busy, setBusy] = useState<'solo' | 'couple' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createSolo() {
    if (!user) return;
    setBusy('solo');
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      await createSpace({ userId: user.id, kind: 'solo' });
      // SessionGate will redirect to /(tabs)/home
    } catch (e: any) {
      console.warn('[onboarding] failed', e);
      setError(e?.message ?? e?.body?.message ?? JSON.stringify(e) ?? 'Could not create space');
    } finally {
      setBusy(null);
    }
  }

  async function createCouple() {
    if (!user) return;
    setBusy('couple');
    setError(null);
    try {
      await ensureUserRow({ userId: user.id, email: user.email });
      const { inviteCode } = await createSpace({ userId: user.id, kind: 'couple' });
      router.push({ pathname: '/(auth)/invite-code', params: { code: inviteCode ?? '' } } as any);
    } catch (e: any) {
      console.warn('[onboarding] failed', e);
      setError(e?.message ?? e?.body?.message ?? JSON.stringify(e) ?? 'Could not create space');
    } finally {
      setBusy(null);
    }
  }

  function goJoin() {
    router.push('/(auth)/invite' as any);
  }

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: C.ink }]}>
      <CouplRings size={48} a={C.peach} b={C.lavender} />
      <Display size={40} style={{ marginTop: 18 }}>
        Welcome<Text style={{ color: C.gold }}>.</Text>
      </Display>
      <GoldRule width={32} />
      <Text style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.mist, fontSize: 16, marginTop: 14, maxWidth: 280 }}>
        A quiet place. Start alone, together, or join what's already there.
      </Text>

      {error && (
        <Text style={{ color: C.error, fontFamily: F.body, fontSize: 13, marginTop: 16 }}>
          {error}
        </Text>
      )}

      <View style={{ marginTop: 40, gap: 14 }}>
        <Animated.View entering={FadeInDown.delay(0).duration(420).springify().damping(18)}>
          <BlockCard bg={C.peach} ink={C.peachInk} onPress={busy === null ? createSolo : undefined}>
            <Overline>Just me</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.peachInk, marginTop: 6, fontWeight: '700' }}>
              Solo space
            </Text>
            <Text style={{ fontFamily: F.body, color: C.peachInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              {busy === 'solo' ? 'Creating…' : 'Use Coupl on your own. Invite a partner later.'}
            </Text>
            <Row ink={C.peachInk} label="BEGIN" />
          </BlockCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(420).springify().damping(18)}>
          <BlockCard bg={C.lavender} ink={C.lavenderInk} onPress={busy === null ? createCouple : undefined}>
            <Overline>With partner</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.lavenderInk, marginTop: 6, fontWeight: '700' }}>
              Create a couple
            </Text>
            <Text style={{ fontFamily: F.body, color: C.lavenderInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              {busy === 'couple' ? 'Creating…' : 'We\u2019ll generate a code for your partner.'}
            </Text>
            <Row ink={C.lavenderInk} label="BEGIN" />
          </BlockCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(420).springify().damping(18)}>
          <BlockCard bg={C.butter} ink={C.butterInk} onPress={busy === null ? goJoin : undefined}>
            <Overline>Invited</Overline>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.butterInk, marginTop: 6, fontWeight: '700' }}>
              I have a code
            </Text>
            <Text style={{ fontFamily: F.body, color: C.butterInk, opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              Enter the 6-character code your partner shared.
            </Text>
            <Row ink={C.butterInk} label="ENTER CODE" />
          </BlockCard>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

function Row({ ink, label }: { ink: string; label: string }) {
  const { F } = useTheme();
  return (
    <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: ink, fontFamily: F.bodyBold, fontSize: 12 }}>{label}</Text>
      <Icon name="arrowRight" size={14} color={ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, paddingBottom: 60 },
});
