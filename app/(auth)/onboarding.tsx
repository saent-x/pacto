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
import {
  type FeatureEntry,
  type FeatureId,
  getDefaultFeatureIds,
  getSupportedFeatures,
  sanitizeFeatureIds,
} from '@/src/lib/features/registry';

type Mode = 'solo' | 'pair' | 'crew';

export default function Onboarding() {
  const router = useRouter();
  const { C } = useTheme();
  const { user } = useSession();
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureId[]>([]);
  const [busy, setBusy] = useState<'create' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(mode: Mode) {
    setMode(mode);
    setSelectedFeatures(getDefaultFeatureIds(mode));
    setError(null);
  }

  function toggleFeature(id: FeatureId) {
    setSelectedFeatures((current) =>
      current.includes(id)
        ? current.filter((featureId) => featureId !== id)
        : [...current, id],
    );
  }

  async function createSelectedSpace() {
    if (!mode) return;
    if (!user) {
      router.replace('/(auth)/sign-in' as any);
      return;
    }
    setBusy('create');
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
      const result = await createSpace({
        userId: user.id,
        kind: wireKind,
        mode,
        enabledFeatures: sanitizeFeatureIds(selectedFeatures, mode),
      });
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

  const supportedFeatures = mode ? getSupportedFeatures(mode) : [];

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
          selected={mode === 'solo'}
          testID="onboarding-mode-solo"
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
          selected={mode === 'pair'}
          testID="onboarding-mode-pair"
          onPress={() => pick('pair')}
        />

        <ModeCard
          eyebrow="SMALL GROUP"
          title="Crew"
          description="3–8 people. House, family, project crew."
          accent={C.accent3}
          left={<CrewStack size={28} />}
          selected={mode === 'crew'}
          testID="onboarding-mode-crew"
          onPress={() => pick('crew')}
        />
      </View>

      {mode ? (
        <View style={styles.featureSection}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>ENABLE FEATURES</Text>
            <Text style={[Typography.caption, { color: C.ink2, marginTop: 6 }]}>
              Start with defaults, adjust anytime.
            </Text>
          </View>

          <View style={styles.features}>
            {supportedFeatures.map((feature) => (
              <FeatureRow
                key={feature.id}
                feature={feature}
                selected={selectedFeatures.includes(feature.id)}
                onPress={() => toggleFeature(feature.id)}
              />
            ))}
          </View>

          <PressScale
            testID="onboarding-create-space"
            onPress={busy === 'create' ? undefined : createSelectedSpace}
            style={[styles.createButton, { backgroundColor: C.accent }]}
            haptic="success"
          >
            <Text style={[Typography.bodyMedium, { color: C.bg }]}>
              {busy === 'create' ? 'Creating…' : 'Continue'}
            </Text>
            <Icon name="arrowRight" size={16} color={C.bg} />
          </PressScale>
        </View>
      ) : null}

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
  selected,
  testID,
  onPress,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  left: React.ReactNode;
  selected: boolean;
  testID: string;
  onPress: () => void;
}) {
  const { C } = useTheme();
  return (
    <PressScale testID={testID} onPress={onPress}>
      <Card
        style={[
          styles.modeCard,
          selected ? { borderColor: accent, backgroundColor: C.bgSoft } : null,
        ]}
      >
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
              {description}
            </Text>
          </View>
          <Icon name={selected ? 'check' : 'arrowRight'} size={16} color={selected ? accent : C.ink3} />
        </View>
      </Card>
    </PressScale>
  );
}

function FeatureRow({
  feature,
  selected,
  onPress,
}: {
  feature: FeatureEntry;
  selected: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  return (
    <PressScale testID={`feature-toggle-${feature.id}`} onPress={onPress}>
      <Card
        style={[
          styles.featureCard,
          selected ? { borderColor: C.accent, backgroundColor: C.bgSoft } : null,
        ]}
      >
        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIcon,
              { backgroundColor: selected ? C.accentSoft : C.bgSoft },
            ]}
          >
            <Icon name={feature.icon} size={18} color={selected ? C.accent : C.ink2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodyMedium, { color: C.inkColor }]}>
              {feature.label}
            </Text>
            <Text style={[Typography.caption, { color: C.ink2, marginTop: 3 }]}>
              {feature.description}
            </Text>
          </View>
          <View
            style={[
              styles.featureCheck,
              {
                borderColor: selected ? C.accent : C.lineColor,
                backgroundColor: selected ? C.accent : 'transparent',
              },
            ]}
          >
            {selected ? <Icon name="check" size={13} color={C.bg} /> : null}
          </View>
        </View>
      </Card>
    </PressScale>
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
  featureSection: { marginTop: 28 },
  sectionHeader: { marginBottom: 12 },
  features: { gap: 10 },
  featureCard: { padding: 14 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
