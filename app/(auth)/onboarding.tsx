import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  AvatarPair,
  Card,
  CrewStack,
  HeaderBrand,
  PactoMark,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { DEFAULT_AVATARS, randomDefaultAvatarId } from '@/src/constants/defaultAvatars';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { createSpace, ensureUserRow } from '@/src/lib/space-actions';

type Mode = 'solo' | 'pair' | 'crew';

export default function Onboarding() {
  const router = useRouter();
  const { C } = useTheme();
  const { user } = useSession();
  const [busy, setBusy] = useState<Mode | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(mode: Mode) {
    if (!user) return;
    setBusy(mode);
    setError(null);
    try {
      await ensureUserRow({
        userId: user.id,
        email: user.email,
        avatarUrl: user.avatarUrl ?? randomDefaultAvatarId(),
      });
      // Schema-side kind value is still 'solo'/'couple' until Phase 9 migration.
      // 'pair' and 'crew' both map to 'couple' on the wire for now; session
      // boundary normalizes back to mode.
      const wireKind: 'solo' | 'couple' = mode === 'solo' ? 'solo' : 'couple';
      const result = await createSpace({ userId: user.id, kind: wireKind });
      if (mode !== 'solo' && result.inviteCode) {
        router.push({
          pathname: '/(auth)/invite-code',
          params: { code: result.inviteCode },
        } as any);
      }
    } catch (e: any) {
      console.warn('[onboarding] failed', e);
      setError(e?.message ?? e?.body?.message ?? 'Could not create space');
    } finally {
      setBusy(null);
    }
  }

  function goJoin() {
    router.push('/(auth)/invite' as any);
  }

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.hero}>
        <PactoMark size={56} />
        <View style={{ height: 16 }} />
        <HeaderBrand eyebrow="START YOUR PACT" title="welcome" size={32} />
        <Text
          style={[
            Typography.body,
            { color: C.ink2, marginTop: 14, textAlign: 'center', maxWidth: 300 },
          ]}
        >
          What kind of pact are you starting?
        </Text>
      </View>

      {error ? (
        <Text
          style={[
            Typography.caption,
            { color: C.error, marginBottom: 16, textAlign: 'center' },
          ]}
        >
          {error}
        </Text>
      ) : null}

      <View style={styles.cards}>
        <ModeCard
          eyebrow="JUST ME"
          title="Solo"
          description="Pacts with yourself."
          accent={C.accent}
          left={<Avatar person={{ avatarUrl: DEFAULT_AVATARS[0].id, color: C.accent }} size={36} />}
          busy={busy === 'solo'}
          onPress={() => pick('solo')}
        />

        <ModeCard
          eyebrow="TWO OF YOU"
          title="Pair"
          description="Any two-person bond — partner, friend, roommate."
          accent={C.accent2}
          left={
            <AvatarPair
              a={{ avatarUrl: DEFAULT_AVATARS[1].id, color: C.accent }}
              b={{ avatarUrl: DEFAULT_AVATARS[2].id, color: C.accent2 }}
              size={32}
            />
          }
          busy={busy === 'pair'}
          onPress={() => pick('pair')}
        />

        <ModeCard
          eyebrow="SMALL GROUP"
          title="Crew"
          description="3–8 people. House, family, project crew."
          accent={C.accent3}
          left={<CrewStack size={28} />}
          busy={busy === 'crew'}
          onPress={() => pick('crew')}
        />
      </View>

      <PressScale onPress={goJoin} style={styles.joinLink}>
        <Text style={[Typography.captionMedium, { color: C.ink2 }]}>
          Already have an invite code?
        </Text>
        <Icon name="arrowRight" size={14} color={C.ink2} />
      </PressScale>
    </ScrollView>
  );
}

function ModeCard({
  eyebrow,
  title,
  description,
  accent,
  left,
  busy,
  onPress,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  left: React.ReactNode;
  busy: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  return (
    <Card onPress={busy ? undefined : onPress} style={styles.modeCard}>
      <View style={styles.modeRow}>
        <View style={styles.modeLeft}>{left}</View>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.eyebrowSm, { color: accent }]}>{eyebrow}</Text>
          <Text
            style={[
              {
                fontFamily: Typography.pixelFont,
                fontSize: 22,
                lineHeight: 24,
                color: C.inkColor,
                letterSpacing: -0.3,
                marginTop: 4,
              },
            ]}
          >
            {title}
            <Text style={{ color: accent }}>.</Text>
          </Text>
          <Text style={[Typography.caption, { color: C.ink2, marginTop: 6 }]}>
            {busy ? 'Creating…' : description}
          </Text>
        </View>
        <Icon name="arrowRight" size={16} color={C.ink3} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 64, paddingBottom: 60 },
  hero: { alignItems: 'center', marginBottom: 32 },
  cards: { gap: 12 },
  modeCard: { padding: 18 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  modeLeft: {
    width: 56,
    alignItems: 'center',
  },
  joinLink: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
});
