import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, HeaderBrand, PactoMark } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { Typography } from '@/src/constants/typography';
import { randomDefaultAvatarId } from '@/src/constants/defaultAvatars';
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
import type { SpaceMode } from '@/src/lib/session';

const FEATURE_TILE_COPY: Record<FeatureId, string> = {
  tasks: 'Lists & chores',
  calendar: 'Dates & events',
  wishlist: 'Gift ideas',
  memories: 'Notes & moments',
  journal: 'Private/shared',
  checkins: 'Mood updates',
  recurring: 'Repeating routines',
  timetable: 'Weekly rhythm',
  goals: 'Plans & priorities',
};

const MODE_LABEL: Record<SpaceMode, string> = {
  solo: 'Solo',
  pair: 'Pair',
  crew: 'Crew',
};

export default function OnboardingFeatures() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { C } = useTheme();
  const { user } = useSession();
  const mode = normalizeMode(params.mode);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureId[]>(
    () => (mode ? getDefaultFeatureIds(mode) : []),
  );
  const [busy, setBusy] = useState<'create' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supportedFeatures = useMemo(
    () => (mode ? getSupportedFeatures(mode) : []),
    [mode],
  );

  function toggleFeature(id: FeatureId) {
    setSelectedFeatures((current) =>
      current.includes(id)
        ? current.filter((featureId) => featureId !== id)
        : [...current, id],
    );
  }

  async function createSelectedSpace() {
    if (!mode) {
      router.replace('/(auth)/onboarding' as any);
      return;
    }
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

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: C.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerBackground: () => null,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: C.inkColor,
          title: '',
          headerLeft: () => (
            <PressScale onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
              <Icon name="chevronLeft" size={22} color={C.inkColor} strokeWidth={2.2} />
            </PressScale>
          ),
        }}
      />

      <View style={styles.hero}>
        <PactoMark size={50} />
        <View style={{ height: 14 }} />
        <HeaderBrand eyebrow={`${mode ? MODE_LABEL[mode] : 'YOUR'} PACT`} title="choose features" size={30} />
        <Text
          style={[
            Typography.body,
            { color: C.ink2, marginTop: 12, textAlign: 'center', maxWidth: 330 },
          ]}
        >
          Start with defaults, adjust anytime.
        </Text>
      </View>

      {error ? (
        <Text style={[Typography.caption, { color: C.error, marginBottom: 14, textAlign: 'center' }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.features}>
        {supportedFeatures.map((feature) => (
          <FeatureTile
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
          {busy === 'create' ? 'Creating...' : 'Continue'}
        </Text>
        <Icon name="arrowRight" size={16} color={C.bg} />
      </PressScale>
    </ScrollView>
  );
}

function FeatureTile({
  feature,
  selected,
  onPress,
}: {
  feature: FeatureEntry;
  selected: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const accent = featureTileAccent(feature.id, C);
  return (
    <PressScale
      testID={`feature-toggle-${feature.id}`}
      onPress={onPress}
      style={styles.featureTilePressable}
    >
      <Card
        style={[
          styles.featureTile,
          {
            borderColor: selected ? accent : `${accent}55`,
            backgroundColor: selected ? `${accent}1F` : C.bgSoft,
          },
        ]}
      >
        <View style={[styles.featureAccentRail, { backgroundColor: accent }]} />
        <View style={styles.featureTileTop}>
          <View
            style={[
              styles.featureIcon,
              {
                backgroundColor: `${accent}24`,
                borderColor: `${accent}45`,
              },
            ]}
          >
            <Icon name={feature.icon} size={20} color={selected ? accent : C.ink2} />
          </View>
          <View
            style={[
              styles.featureCheck,
              {
                borderColor: selected ? accent : `${accent}4D`,
                backgroundColor: selected ? accent : 'transparent',
              },
            ]}
          >
            {selected ? <Icon name="check" size={14} color={C.bg} /> : null}
          </View>
        </View>
        <View style={styles.featureTileCopy}>
          <Text numberOfLines={1} style={[Typography.captionMedium, { color: C.inkColor, lineHeight: 17 }]}>
            {feature.label}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              Typography.smallMedium,
              { color: selected ? C.ink2 : C.ink3, marginTop: 5, fontSize: 10.5, lineHeight: 14 },
            ]}
          >
            {FEATURE_TILE_COPY[feature.id]}
          </Text>
        </View>
      </Card>
    </PressScale>
  );
}

function normalizeMode(value: string | string[] | undefined): SpaceMode | null {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === 'solo' || mode === 'pair' || mode === 'crew' ? mode : null;
}

function featureTileAccent(featureId: FeatureId, C: ReturnType<typeof useTheme>['C']) {
  const map: Record<FeatureId, string> = {
    tasks: C.accent,
    calendar: C.accent2,
    wishlist: C.accent3,
    memories: C.peach,
    journal: C.journal,
    checkins: C.sky,
    recurring: C.reminders,
    timetable: C.lavender,
    goals: C.plans,
  };
  return map[featureId];
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 58, paddingBottom: 54 },
  hero: { alignItems: 'center', marginBottom: 26 },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureTilePressable: {
    width: '31.8%',
    minWidth: 84,
    flexGrow: 0,
  },
  featureTile: {
    height: 108,
    padding: 11,
    justifyContent: 'space-between',
  },
  featureAccentRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  featureTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTileCopy: {
    marginTop: 10,
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
    marginTop: 24,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
