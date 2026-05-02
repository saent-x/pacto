import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarPair, Card, CrewStack, Pill } from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { DEFAULT_AVATARS, type DefaultAvatarId } from '@/src/constants/defaultAvatars';
import { Typography } from '@/src/constants/typography';
import {
  type FeatureId,
  getSupportedFeatures,
  sanitizeFeatureIds,
} from '@/src/lib/features/registry';
import { useTheme } from '@/src/lib/theme';
import { type SpaceMode, useSession } from '@/src/lib/session';
import { db } from '@/src/lib/db';
import {
  leaveSpace,
  regenerateInviteCode,
  updateSpaceFeatures,
  updateUserAvatar,
} from '@/src/lib/space-actions';

export default function ProfileSheet() {
  const { C, mode: themeMode, setMode } = useTheme();
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

  const me =
    session.user?.displayName?.trim() ||
    session.user?.email?.split('@')[0] ||
    'You';
  const partnerName = session.partner
    ? session.partner.displayName?.trim() ||
      session.partner.email?.split('@')[0] ||
      'Partner'
    : null;

  const myInitial = me.charAt(0).toUpperCase();
  const partnerInitial = partnerName?.charAt(0).toUpperCase() ?? 'P';
  const selectedAvatar = session.user?.avatarUrl ?? null;

  const spaceMode = session.space?.kind ?? 'solo';
  const isSolo = spaceMode === 'solo';
  const isCrew = spaceMode === 'crew';
  const isPair = spaceMode === 'pair';
  const supportedFeatures =
    session.status === 'ready' && session.space
      ? getSupportedFeatures(featureMode)
      : [];

  const anniversary = session.space?.anniversary
    ? parseISO(session.space.anniversary)
    : null;
  const anniversaryLabel = anniversary
    ? format(anniversary, 'MMM d, yyyy')
    : 'Add date →';

  const inviteCode = session.space?.inviteCode ?? null;
  const statusLine = isSolo
    ? 'Solo pact'
    : isCrew
    ? session.space?.name ?? 'Crew pact'
    : `Paired with ${partnerName ?? 'someone'}`;

  async function onGenerateCode() {
    if (!session.space) return;
    const code = inviteCode ?? (await regenerateInviteCode({ spaceId: session.space.id }));
    navRouter.push({ pathname: '/(auth)/invite-code', params: { code } } as any);
  }

  function onSignOut() {
    Alert.alert('Sign out?', "You'll need to sign in again to see your pact.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await db.auth.signOut();
        },
      },
    ]);
  }

  function onLeave() {
    if (!session.space || !session.membership) return;
    const isLast = !session.partner;
    const msg = isLast
      ? 'This deletes your solo pact and everything in it. Cannot be undone.'
      : 'You will no longer see shared content. The other member keeps the pact.';
    Alert.alert('Leave this pact?', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveSpace({
            spaceId: session.space!.id,
            membershipId: session.membership!.id,
            isLastMember: isLast,
          });
        },
      },
    ]);
  }

  async function onSelectAvatar(avatarUrl: DefaultAvatarId) {
    if (!session.user) return;
    Haptics.selectionAsync().catch(() => undefined);
    try {
      await updateUserAvatar({ userId: session.user.id, avatarUrl });
    } catch (err) {
      console.warn('[profile] avatar update failed', err);
      Alert.alert('Avatar update failed', 'Try again.');
    }
  }

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
      console.warn('[profile] feature update failed', err);
      setEnabledFeatureIds(previous);
      Alert.alert('Feature update failed', 'Try again.');
    } finally {
      isSavingFeaturesRef.current = false;
      setIsSavingFeatures(false);
    }
  }

  type SettingRow =
    | {
        kind: 'value';
        label: string;
        value: string;
        icon: IconName;
        muted?: boolean;
        accent?: boolean;
        testID?: string;
        onPress?: () => void;
      };

  const rows: SettingRow[] = [
    {
      kind: 'value',
      label: 'Display name',
      value: me,
      icon: 'user',
      testID: 'profile-row-name',
    },
    {
      kind: 'value',
      label: 'Email',
      value: session.user?.email ?? '—',
      icon: 'mail',
      muted: true,
      testID: 'profile-row-email',
    },
    ...(isPair || isCrew
      ? ([
          {
            kind: 'value',
            label: 'Anniversary',
            value: anniversaryLabel,
            icon: 'heart',
            testID: 'profile-row-anniversary',
          },
          {
            kind: 'value',
            label: 'Invite code',
            value: session.partner ? '— paired —' : inviteCode ?? 'Generate →',
            icon: 'sparkle',
            muted: !!session.partner,
            accent: !session.partner,
            onPress: !session.partner ? onGenerateCode : undefined,
            testID: 'profile-row-code',
          },
        ] as SettingRow[])
      : ([
          {
            kind: 'value',
            label: 'Invite a member',
            value: 'Generate code →',
            icon: 'users',
            accent: true,
            onPress: onGenerateCode,
            testID: 'profile-row-invite',
          },
        ] as SettingRow[])),
  ];

  return (
    <SheetShell eyebrow="PROFILE" title="profile">
      {/* Identity */}
      <View style={styles.identity}>
        {isSolo ? (
          <Avatar
            person={{ initial: myInitial, color: C.accent, avatarUrl: session.user?.avatarUrl }}
            size={62}
          />
        ) : isCrew ? (
          <CrewStack size={42} />
        ) : (
          <AvatarPair
            a={{ initial: myInitial, color: C.accent, avatarUrl: session.user?.avatarUrl }}
            b={{ initial: partnerInitial, color: C.accent2, avatarUrl: session.partner?.avatarUrl }}
            size={48}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodyLg, { color: C.inkColor, fontFamily: Typography.geistSemiBoldFont }]}>
            {me}
          </Text>
          <Text style={[Typography.caption, { color: C.ink3, marginTop: 2 }]} numberOfLines={1}>
            {session.user?.email ?? '—'}
          </Text>
          <Pill color={isSolo ? C.accent : isCrew ? C.accent3 : C.accent2} style={{ marginTop: 7 }}>
            {statusLine}
          </Pill>
        </View>
      </View>

      <Card padded={false} style={{ marginBottom: 14 }}>
        <View style={styles.avatarPicker}>
          <Text style={[Typography.body, { flex: 1, color: C.inkColor }]}>
            Avatar
          </Text>
          <View style={styles.avatarChoices}>
            {DEFAULT_AVATARS.map((avatar) => {
              const selected = selectedAvatar === avatar.id;
              return (
                <PressScale
                  key={avatar.id}
                  testID={`profile-avatar-${avatar.id}`}
                  onPress={() => onSelectAvatar(avatar.id)}
                  style={[
                    styles.avatarChoice,
                    {
                      borderColor: selected ? C.accent : C.lineColor,
                      backgroundColor: selected ? `${C.accent}22` : C.bgSoft,
                    },
                  ]}
                >
                  <Avatar person={{ avatarUrl: avatar.id, color: C.accent }} size={34} />
                </PressScale>
              );
            })}
          </View>
        </View>
      </Card>

      {/* Settings card */}
      <Card padded={false} style={{ marginBottom: 14 }}>
        {rows.map((r, i) => (
          <PressScale
            key={r.label}
            onPress={r.onPress}
            disabled={!r.onPress}
            testID={r.testID}
            style={[
              styles.row,
              i < rows.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: C.lineColor }
                : null,
            ]}
          >
            <Icon
              name={r.icon}
              size={18}
              color={r.accent ? C.accent : C.ink3}
              strokeWidth={1.8}
            />
            <Text
              style={[
                Typography.body,
                { flex: 1, color: r.accent ? C.accent : C.inkColor },
              ]}
            >
              {r.label}
            </Text>
            <Text
              style={[
                Typography.body,
                { color: r.muted ? C.ink3 : C.ink2 },
              ]}
              numberOfLines={1}
            >
              {r.value}
            </Text>
          </PressScale>
        ))}
      </Card>

      {supportedFeatures.length > 0 ? (
        <>
          <Text style={[Typography.eyebrowSm, { color: C.ink3, marginLeft: 4, marginBottom: 10 }]}>
            Features
          </Text>
          <Card padded={false} style={{ marginBottom: 14 }}>
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
        </>
      ) : null}

      {/* Theme card */}
      <Card padded={false} style={{ marginBottom: 22 }}>
        <View style={styles.themeRow}>
          <Icon name="sun" size={18} color={C.ink3} strokeWidth={1.8} />
          <Text style={[Typography.body, { flex: 1, color: C.inkColor }]}>Theme</Text>
          <View style={[styles.seg, { backgroundColor: C.bgSoft, borderColor: C.lineColor }]}>
            {(['light', 'dark'] as const).map((m) => {
              const sel = themeMode === m;
              return (
                <PressScale
                  key={m}
                  testID={`profile-theme-${m}`}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setMode(m);
                  }}
                  style={[
                    styles.segItem,
                    sel ? { backgroundColor: C.bgCard, borderColor: C.lineColor, borderWidth: 1 } : null,
                  ]}
                >
                  <Text
                    style={[
                      Typography.captionMedium,
                      { color: sel ? C.inkColor : C.ink3 },
                    ]}
                  >
                    {m === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        </View>
      </Card>

      <Text style={[Typography.eyebrowSm, { color: C.ink3, marginLeft: 4, marginBottom: 10 }]}>
        Danger zone
      </Text>
      <Card padded={false} style={{ borderColor: `${C.error}55` }}>
        <PressScale
          testID={isSolo ? 'profile-signout' : 'profile-leave'}
          onPress={isSolo ? onSignOut : onLeave}
          haptic="warning"
          style={styles.dangerRow}
        >
          <Icon name={isSolo ? 'logOut' : 'trash'} size={17} color={C.error} />
          <Text style={[Typography.bodyMedium, { flex: 1, color: C.error }]}>
            {isSolo ? 'Sign out' : 'Leave pact'}
          </Text>
        </PressScale>
      </Card>

      {!isSolo ? (
        <PressScale
          testID="profile-signout"
          onPress={onSignOut}
          haptic="warning"
          style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
        >
          <Text style={[Typography.captionMedium, { color: C.ink3 }]}>Sign out</Text>
        </PressScale>
      ) : null}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
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
  avatarPicker: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarChoices: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  avatarChoice: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  seg: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segItem: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  bottomBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  dangerRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
});

function normalizeProfileMode(mode: SpaceMode | 'couple'): SpaceMode {
  return mode === 'couple' ? 'pair' : mode;
}
