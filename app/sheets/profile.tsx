import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { Typography } from '@/src/constants/typography';
import { deleteAccountFromServer } from '@/src/lib/account';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { db } from '@/src/lib/db';
import {
  createSharedPactInvite,
  leaveSpace,
  regenerateInviteCode,
} from '@/src/lib/space-actions';
import { unregisterPushTokenForUser } from '@/src/lib/notifications';

export default function ProfileSheet() {
  const { C, mode: themeMode, setMode } = useTheme();
  const navRouter = useRouter();
  const session = useSession();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const inviteBusyRef = useRef(false);
  const deleteBusyRef = useRef(false);
  const leaveBusyRef = useRef(false);

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

  const inviteCode = session.space?.inviteCode ?? null;
  const memberCount = session.space?.memberCount ?? 1 + (session.members?.length ?? 0);
  const hasOtherMembers = memberCount > 1;
  const canDeleteAccount = deleteConfirmText.trim().toUpperCase() === 'IRREVERSIBLE';

  async function onGenerateCode() {
    if (inviteBusyRef.current || !session.space || !session.user) return;
    inviteBusyRef.current = true;
    setInviteBusy(true);
    try {
      const shouldPromotePairInvite = isPair && hasOtherMembers;
      let code: string;
      if (isSolo) {
        code = await createSharedPactInvite({ userId: session.user.id, mode: 'pair' });
      } else if (!shouldPromotePairInvite && inviteCode) {
        code = inviteCode;
      } else {
        code = await regenerateInviteCode({
          spaceId: session.space.id,
          userId: session.user.id,
          promoteToCrew: shouldPromotePairInvite,
        });
      }
      navRouter.push({ pathname: '/(auth)/invite-code', params: { code } } as any);
    } catch {
      Alert.alert('Invite failed', 'Try again.');
    } finally {
      inviteBusyRef.current = false;
      setInviteBusy(false);
    }
  }

  function onSignOut() {
    Alert.alert('Sign out?', "You'll need to sign in again to see your pact.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          if (session.user?.id) {
            try {
              await unregisterPushTokenForUser(session.user.id);
            } catch (error) {
              console.warn('[profile] push-token unregister failed during sign-out', error);
            }
          }
          await db.auth.signOut();
        },
      },
    ]);
  }

  function onLeave() {
    if (!session.space || !session.membership) return;
    const remainingMemberCount = Math.max(memberCount - 1, 0);
    const isLast = remainingMemberCount === 0;
    const msg = isLast
      ? 'You will leave this pact. Your private entries stay in your solo base.'
      : 'You will no longer see shared content. Your private entries stay in your solo base.';
    Alert.alert('Leave this pact?', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (leaveBusyRef.current) return;
          leaveBusyRef.current = true;
          try {
            await leaveSpace({
              userId: session.user!.id,
              spaceId: session.space!.id,
              membershipId: session.membership!.id,
              isLastMember: isLast,
              remainingMemberCount,
              personalSpaceId: session.personalSpaceId,
            });
          } catch {
            Alert.alert('Leave failed', 'Try again.');
          } finally {
            leaveBusyRef.current = false;
          }
        },
      },
    ]);
  }

  function openDeleteAccount() {
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  async function onDeleteAccount() {
    if (!canDeleteAccount || !session.user) return;
    if (deleteBusyRef.current) return;
    deleteBusyRef.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const memberCount = session.space?.memberCount;
      await deleteAccountFromServer({
        membershipId: session.membership?.id ?? null,
        spaceId: session.space?.id ?? null,
        isLastMember:
          typeof memberCount === 'number' ? memberCount <= 1 : undefined,
        personalMembershipId: session.soloMembership?.id ?? null,
        personalSpaceId: session.personalSpaceId ?? null,
        sharedMembershipId: session.sharedMembership?.id ?? null,
        sharedSpaceId: session.sharedSpaceId ?? null,
        sharedIsLastMember:
          typeof memberCount === 'number' && !isSolo ? memberCount <= 1 : undefined,
      });
      await db.auth.signOut();
    } catch (error) {
      setDeleteError('Could not delete the account. Please try again.');
    } finally {
      deleteBusyRef.current = false;
      setDeleteBusy(false);
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
        disabled?: boolean;
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
            label: 'Invite a member',
            value: inviteBusy ? 'Generating...' : inviteCode ?? 'Generate →',
            icon: 'sparkle',
            accent: true,
            disabled: inviteBusy,
            onPress: onGenerateCode,
            testID: 'profile-row-code',
          },
        ] as SettingRow[])
      : ([
          {
            kind: 'value',
            label: 'Invite a member',
            value: inviteBusy ? 'Generating...' : 'Generate code →',
            icon: 'users',
            accent: true,
            disabled: inviteBusy,
            onPress: onGenerateCode,
            testID: 'profile-row-invite',
          },
          {
            kind: 'value',
            label: 'Join a pact',
            value: 'Enter code →',
            icon: 'link',
            onPress: () => navRouter.push('/(auth)/invite' as any),
            testID: 'profile-row-join',
          },
        ] as SettingRow[])),
  ];

  return (
    <SheetShell eyebrow="PROFILE" title="profile">
      {/* Settings card */}
      <Card padded={false} style={{ marginBottom: 14 }}>
        {rows.map((r, i) => (
          <PressScale
            key={r.label}
            onPress={r.onPress}
            disabled={!r.onPress || r.disabled}
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
        <PressScale
          testID="profile-delete-account"
          onPress={openDeleteAccount}
          haptic="warning"
          style={[styles.dangerRow, { borderTopWidth: 1, borderTopColor: `${C.error}22` }]}
        >
          <Icon name="trash" size={17} color={C.error} />
          <Text style={[Typography.bodyMedium, { flex: 1, color: C.error }]}>
            Delete account
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

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            testID="profile-delete-account-modal"
            style={[
              styles.deleteModal,
              { backgroundColor: C.bgCard, borderColor: `${C.error}66` },
            ]}
          >
            <View style={[styles.deleteIcon, { backgroundColor: `${C.error}18` }]}>
              <Icon name="trash" size={22} color={C.error} />
            </View>
            <Text style={[Typography.subheading, { color: C.inkColor, textAlign: 'center' }]}>
              Delete account?
            </Text>
            <Text style={[Typography.body, { color: C.ink2, textAlign: 'center', marginTop: 10 }]}>
              This is irreversible. Your solo pact and linked items will be deleted.
              In shared pacts, your membership and personal rows are removed.
            </Text>
            <Text style={[Typography.eyebrowSm, { color: C.ink3, marginTop: 20, alignSelf: 'flex-start' }]}>
              Type IRREVERSIBLE
            </Text>
            <TextInput
              testID="profile-delete-account-input"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleteBusy}
              placeholder="IRREVERSIBLE"
              placeholderTextColor={C.ink3}
              style={[
                styles.deleteInput,
                {
                  borderColor: canDeleteAccount ? C.error : C.lineColor,
                  color: C.inkColor,
                  backgroundColor: C.bg,
                },
              ]}
            />
            {deleteError ? (
              <Text style={[Typography.caption, { color: C.error, marginTop: 10 }]}>
                {deleteError}
              </Text>
            ) : null}
            <View style={styles.deleteActions}>
              <PressScale
                testID="profile-delete-account-cancel"
                onPress={() => setDeleteModalOpen(false)}
                disabled={deleteBusy}
                style={[styles.deleteSecondary, { borderColor: C.lineColor }]}
              >
                <Text style={[Typography.captionMedium, { color: C.ink2 }]}>Cancel</Text>
              </PressScale>
              <PressScale
                testID="profile-delete-account-confirm"
                onPress={onDeleteAccount}
                disabled={!canDeleteAccount || deleteBusy}
                haptic="warning"
                style={[
                  styles.deletePrimary,
                  {
                    backgroundColor: C.error,
                    opacity: !canDeleteAccount || deleteBusy ? 0.45 : 1,
                  },
                ]}
              >
                <Text style={[Typography.captionMedium, { color: C.bg }]}>
                  {deleteBusy ? 'Deleting...' : 'Delete'}
                </Text>
              </PressScale>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(20, 24, 39, 0.52)',
  },
  deleteModal: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  deleteIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deleteInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    fontFamily: Typography.geistMonoMediumFont,
    fontSize: 14,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  deleteSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deletePrimary: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
