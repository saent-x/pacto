import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { Card } from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import {
  getSupportedFeatures,
  sanitizeFeatureIds,
} from '@/src/lib/features/registry';
import { useTheme } from '@/src/lib/theme';
import { type SpaceMode, useSession } from '@/src/lib/session';
import { db } from '@/src/lib/db';
import {
  leaveSpace,
  regenerateInviteCode,
} from '@/src/lib/space-actions';

export default function ProfileSheet() {
  const { C, mode: themeMode, setMode } = useTheme();
  const navRouter = useRouter();
  const session = useSession();
  const featureMode = normalizeProfileMode(session.space?.kind ?? session.mode);

  useEffect(() => {
    if (session.status === 'unauthed') {
      navRouter.replace('/(auth)/sign-in' as any);
    }
  }, [session.status, navRouter]);

  const me =
    session.user?.displayName?.trim() ||
    session.user?.email?.split('@')[0] ||
    'You';
  const partnerName = session.partner
    ? session.partner.displayName?.trim() ||
      session.partner.email?.split('@')[0] ||
      'Partner'
    : null;

  const spaceMode = session.space?.kind ?? 'solo';
  const isSolo = spaceMode === 'solo';
  const isCrew = spaceMode === 'crew';
  const isPair = spaceMode === 'pair';
  const supportedFeatures =
    session.status === 'ready' && session.space
      ? getSupportedFeatures(featureMode)
      : [];
  const enabledFeatureCount = sanitizeFeatureIds(session.enabledFeatures, featureMode).length;

  const anniversary = session.space?.anniversary
    ? parseISO(session.space.anniversary)
    : null;
  const anniversaryLabel = anniversary
    ? format(anniversary, 'MMM d, yyyy')
    : 'Add date →';

  const inviteCode = session.space?.inviteCode ?? null;

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
      label: 'Account',
      value: me,
      icon: 'user',
      onPress: () => navRouter.push('/sheets/account' as any),
      testID: 'profile-row-account',
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
    ...(supportedFeatures.length > 0
      ? ([
          {
            kind: 'value',
            label: 'Features',
            value: `${enabledFeatureCount}/${supportedFeatures.length} on →`,
            icon: 'grid',
            onPress: () => navRouter.push('/sheets/profile-features' as any),
            testID: 'profile-row-features',
          },
        ] as SettingRow[])
      : []),
  ];

  return (
    <SheetShell eyebrow="PROFILE" title="profile">
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
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
