import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import {
  type FeatureId,
  getSupportedFeatures,
  sanitizeFeatureIds,
} from '@/src/lib/features/registry';
import { type SpaceMode, useSession } from '@/src/lib/session';
import { updateSpaceFeatures } from '@/src/lib/space-actions';
import { useTheme } from '@/src/lib/theme';

export default function ProfileFeaturesSheet() {
  const { C } = useTheme();
  const navRouter = useRouter();
  const session = useSession();
  const featureMode = normalizeProfileMode(session.space?.kind ?? session.mode);
  const [enabledFeatureIds, setEnabledFeatureIds] = useState<FeatureId[]>(() =>
    sanitizeFeatureIds(session.enabledFeatures, featureMode),
  );
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const isSavingFeaturesRef = useRef(false);

  useEffect(() => {
    if (session.status === 'unauthed') {
      navRouter.replace('/(auth)/sign-in' as any);
    }
  }, [session.status, navRouter]);

  useEffect(() => {
    setEnabledFeatureIds(sanitizeFeatureIds(session.enabledFeatures, featureMode));
  }, [featureMode, session.enabledFeatures]);

  const supportedFeatures =
    session.status === 'ready' && session.space
      ? getSupportedFeatures(featureMode)
      : [];

  async function onToggleFeature(featureId: FeatureId) {
    if (session.status !== 'ready' || !session.space || isSavingFeaturesRef.current) return;

    isSavingFeaturesRef.current = true;
    setIsSavingFeatures(true);
    const previous = enabledFeatureIds;
    const enabled = previous.includes(featureId);
    const next = sanitizeFeatureIds(
      enabled
        ? previous.filter((id) => id !== featureId)
        : [...previous, featureId],
      featureMode,
    );

    setEnabledFeatureIds(next);

    try {
      await updateSpaceFeatures({
        spaceId: session.space.id,
        enabledFeatures: next,
        mode: featureMode,
      });
    } catch (err) {
      console.warn('[profile-features] feature update failed', err);
      setEnabledFeatureIds(previous);
      Alert.alert('Feature update failed', 'Try again.');
    } finally {
      isSavingFeaturesRef.current = false;
      setIsSavingFeatures(false);
    }
  }

  return (
    <SheetShell eyebrow="PROFILE" title="features">
      <Text style={[Typography.caption, { color: C.ink2, marginBottom: 14 }]}>
        Turn modules on or off for this pact. Disabled features are hidden from navigation and creation flows.
      </Text>

      <Card padded={false}>
        {supportedFeatures.map((feature, i) => {
          const enabled = enabledFeatureIds.includes(feature.id);
          return (
            <PressScale
              key={feature.id}
              testID={`profile-feature-${feature.id}`}
              onPress={() => onToggleFeature(feature.id)}
              disabled={isSavingFeatures}
              style={[
                styles.featureRow,
                isSavingFeatures ? styles.featureRowDisabled : null,
                i < supportedFeatures.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: C.lineColor }
                  : null,
              ]}
            >
              <Icon
                name={feature.icon}
                size={18}
                color={isSavingFeatures ? C.ink3 : enabled ? C.accent : C.ink3}
                strokeWidth={1.8}
              />
              <View style={styles.featureCopy}>
                <Text style={[Typography.body, { color: isSavingFeatures ? C.ink2 : C.inkColor }]}>
                  {feature.label}
                </Text>
                <Text
                  style={[Typography.caption, { color: C.ink3, marginTop: 2 }]}
                  numberOfLines={2}
                >
                  {feature.description}
                </Text>
              </View>
              <Text
                testID={`profile-feature-state-${feature.id}`}
                style={[
                  Typography.captionMedium,
                  { color: isSavingFeatures ? C.ink3 : enabled ? C.accent : C.ink3 },
                ]}
              >
                {enabled ? 'On' : 'Off'}
              </Text>
            </PressScale>
          );
        })}
      </Card>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  featureRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  featureRowDisabled: {
    opacity: 0.62,
  },
  featureCopy: {
    flex: 1,
  },
});

function normalizeProfileMode(mode: SpaceMode | 'couple'): SpaceMode {
  return mode === 'couple' ? 'pair' : mode;
}
