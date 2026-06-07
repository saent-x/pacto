import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View, Share, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@cvx/_generated/api';
import { useTheme, ACCENTS, ACCENT_ORDER, type AccentKey, type ThemePref } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { Serif, T, Kick, Div, Icon, Press, RoundBtn, GhostBtn, PrimaryBtn, Mono } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';
import { DISPLAY_NAME_LIMIT, normalizeDisplayNameInput, profileDisplayNameForInput } from '@/features/account/displayName';
import { useAuth } from '@/features/auth/useAuth';
import { unregisterPushToken } from '@/features/notifications/useNotifications';
import { convex } from '@/lib/convex';
import { confirmDelete } from '@/lib/confirm';
import { usePullRefresh } from '@/lib/usePullRefresh';

// Terracotta red for destructive actions — reads on both light + dark.
const DANGER = '#C2564A';

const THEME_OPTIONS: { id: ThemePref; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

export default function Profile() {
  const { C, themePref, setThemePref, accentKey, setAccentKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, space, members, isShared, role } = useSpace();
  const { signOut } = useAuth();
  // Detach this device's push token from the account before signing out, so the
  // previous user stops receiving this device's notifications.
  const doSignOut = async () => {
    await unregisterPushToken(convex);
    signOut();
  };
  const savePrefs = useMutation(api.users.updatePrefs);
  const updateProfile = useMutation(api.users.updateProfile);
  const mySpaces = useQuery(api.spaces.mySpaces, {});
  const switchSpace = useMutation(api.spaces.setActiveSpace);
  const createInvite = useMutation(api.invites.createInvite);
  const removeMember = useMutation(api.members.removeMember);
  const leaveSpace = useMutation(api.members.leaveSpace);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { refreshing, onRefresh } = usePullRefresh();
  const [invite, setInvite] = useState<{ code: string; link: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [displayNameDraft, setDisplayName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const savedDisplayName = useMemo(
    () => profileDisplayNameForInput(user?.displayName, user?.email),
    [user?.displayName, user?.email],
  );
  const profileTitle = savedDisplayName || 'Profile';
  const selfDisplayName = savedDisplayName || 'You';
  const displayMembers = useMemo(
    () => members.map((m) => (m.isYou ? { ...m, displayName: selfDisplayName } : m)),
    [members, selfDisplayName],
  );
  const displayName = displayNameDraft ?? savedDisplayName;
  const cleanDisplayName = useMemo(() => normalizeDisplayNameInput(displayName), [displayName]);
  const nameChanged = cleanDisplayName !== savedDisplayName;


  const saveDisplayName = async () => {
    if (savingName) return;
    if (!cleanDisplayName) {
      setNameSaved(false);
      setNameError('Enter a display name.');
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateProfile({ displayName: cleanDisplayName });
      setDisplayName(null);
      setNameSaved(true);
    } catch {
      setNameSaved(false);
      setNameError('Could not save that name.');
    } finally {
      setSavingName(false);
    }
  };

  const genInvite = async () => {
    if (!space || inviting) return;
    setInviting(true);
    try {
      const r = await createInvite({ spaceId: space.id });
      setInvite({ code: r.code, link: r.link });
    } catch {
      // not owner, or space full
    } finally {
      setInviting(false);
    }
  };

  const pickTheme = (p: ThemePref) => {
    setThemePref(p);
    savePrefs({ themePref: p }).catch(() => {});
  };
  const pickAccent = (a: AccentKey) => {
    setAccentKey(a);
    savePrefs({ accentKey: a }).catch(() => {});
  };

  const onRemoveMember = (userId: string, name: string) =>
    confirmDelete({
      title: `Remove ${name}?`,
      message: space ? `They'll lose access to ${space.name}.` : undefined,
      confirmLabel: 'Remove',
      onConfirm: () => {
        if (space) removeMember({ spaceId: space.id, userId: userId as any });
      },
    });

  const onLeaveSpace = () =>
    confirmDelete({
      title: space ? `Leave ${space.name}?` : 'Leave space?',
      message: 'You can rejoin later with an invite.',
      confirmLabel: 'Leave',
      onConfirm: () => {
        if (space) leaveSpace({ spaceId: space.id });
        router.back();
      },
    });

  const onDeleteAccount = () =>
    confirmDelete({
      title: 'Delete account?',
      message:
        'This permanently deletes your account, your personal space, and all of its data. This cannot be undone.',
      confirmLabel: 'Delete account',
      onConfirm: async () => {
        try {
          await deleteAccount({});
        } catch {
          // even on partial failure, sign the user out
        }
        doSignOut();
      },
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header (fixed) */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 18,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Kick color={C.accent}>{isShared && space ? space.type : 'You'}</Kick>
          <Serif size={34} style={{ marginTop: 4 }} numberOfLines={1}>
            {isShared && space ? space.name : profileTitle}
          </Serif>
        </View>
        <RoundBtn name="x" onPress={() => router.back()} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />
        }
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: insets.bottom + 96 }}
      >
        {/* Display name */}
        <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.hair }}>
          <Kick style={{ marginBottom: 8 }}>Display name</Kick>
          <TextInput
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v);
              setNameSaved(false);
              setNameError(null);
            }}
            placeholder="Your name"
            placeholderTextColor={C.ink4}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            returnKeyType="done"
            maxLength={DISPLAY_NAME_LIMIT}
            onSubmitEditing={saveDisplayName}
            style={{
              fontFamily: FONTS.sans500,
              fontSize: 17,
              color: C.ink,
              paddingBottom: 8,
              borderBottomWidth: 1.5,
              borderBottomColor: C.line,
            }}
          />
          {nameError && (
            <T selectable size={13.5} weight={500} color={C.accent} style={{ marginTop: 10 }}>
              {nameError}
            </T>
          )}
          <PrimaryBtn
            icon="check"
            onPress={saveDisplayName}
            disabled={savingName || !cleanDisplayName || !nameChanged}
            style={{ marginTop: 12 }}
          >
            {savingName ? 'Saving…' : nameSaved && !nameChanged ? 'Saved' : 'Save name'}
          </PrimaryBtn>
        </View>

        {/* Members (shared) */}
        {isShared && space && (
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Kick>Members ·</Kick>
                <Mono size={11} weight={600} lh={1}>
                  {members.length}
                </Mono>
              </View>
              {role === 'owner' && space.memberCount < space.cap && (
                <Press onPress={genInvite}>
                  <Kick color={C.accent}>{inviting ? 'Creating…' : 'Invite +'}</Kick>
                </Press>
              )}
            </View>
            {displayMembers.map((m, i) => (
              <View key={m.userId}>
                {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 }}>
                  <MemberAvatar member={m} size={34} />
                  <T size={15.5} weight={600} style={{ flex: 1 }} numberOfLines={1}>
                    {m.isYou ? (savedDisplayName ? `${m.displayName} (you)` : 'You') : m.displayName}
                  </T>
                  <Kick color={C.ink3}>{m.role === 'owner' ? 'Owner' : 'Member'}</Kick>
                  {role === 'owner' && !m.isYou && (
                    <Press onPress={() => onRemoveMember(m.userId, m.displayName)} hitSlop={8} style={{ marginLeft: 4 }}>
                      <Icon name="x" size={15} color={C.ink4} strokeWidth={2} />
                    </Press>
                  )}
                </View>
              </View>
            ))}

            {invite && (
              <View style={{ marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: C.surface2 }}>
                <Kick color={C.ink3}>Invite code</Kick>
                <Mono size={36} weight={600} style={{ marginTop: 4, letterSpacing: 2 }}>
                  {invite.code}
                </Mono>
                <T size={13.5} weight={450} color={C.ink3} style={{ marginTop: 4, marginBottom: 12 }}>
                  Share this with someone to join {space.name}.
                </T>
                <GhostBtn
                  icon="link"
                  onPress={() =>
                    Share.share({
                      message: `Join ${space.name} on Pacto — code ${invite.code}\n${invite.link}`,
                    })
                  }
                >
                  Share invite
                </GhostBtn>
              </View>
            )}
          </View>
        )}

        {/* Space switcher */}
        {mySpaces && mySpaces.length > 1 && (
          <View style={{ paddingVertical: 18, borderTopWidth: 1, borderTopColor: C.hair, marginTop: 8 }}>
            <Kick style={{ marginBottom: 10 }}>Your spaces</Kick>
            {mySpaces.map((s) => {
              const active = s.spaceId === space?.id;
              return (
                <Press key={s.spaceId} onPress={() => switchSpace({ spaceId: s.spaceId })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: active ? C.accent : C.line }} />
                    <T size={16} weight={active ? 600 : 500} style={{ flex: 1 }} numberOfLines={1}>
                      {s.name}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Kick color={C.ink3}>{s.type} ·</Kick>
                      <Mono size={11} weight={600} color={C.ink3} lh={1}>
                        {s.memberCount}/{s.cap}
                      </Mono>
                    </View>
                  </View>
                </Press>
              );
            })}
          </View>
        )}

        {/* Theme */}
        <View style={{ paddingVertical: 18, borderTopWidth: 1, borderTopColor: C.hair, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Icon name="sun" size={19} color={C.ink2} strokeWidth={1.8} />
            <T size={16.5} weight={500}>
              Appearance
            </T>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 999, padding: 3 }}>
            {THEME_OPTIONS.map((o) => {
              const on = themePref === o.id;
              return (
                <Press
                  key={o.id}
                  onPress={() => pickTheme(o.id)}
                  style={[
                    {
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 999,
                      alignItems: 'center',
                      backgroundColor: on ? C.surface : 'transparent',
                    },
                    on ? ({ boxShadow: '0px 1px 3px rgba(20,20,22,0.10)' } as object) : null,
                  ]}
                >
                  <T size={13.5} weight={600} color={on ? C.ink : C.ink3}>
                    {o.label}
                  </T>
                </Press>
              );
            })}
          </View>
        </View>

        {/* Accent */}
        <View style={{ paddingVertical: 18, borderTopWidth: 1, borderTopColor: C.hair }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="sliders" size={19} color={C.ink2} strokeWidth={1.8} />
              <T size={16.5} weight={500}>
                Accent
              </T>
            </View>
            <Kick color={C.ink3}>{ACCENTS[accentKey].label}</Kick>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {ACCENT_ORDER.map((a) => {
              const on = accentKey === a;
              const hex = ACCENTS[a].light.accent;
              return (
                <Press
                  key={a}
                  onPress={() => pickAccent(a)}
                  style={[
                    { flex: 1, height: 44, borderRadius: 12, backgroundColor: hex },
                    on ? ({ boxShadow: `0px 0px 0px 2px ${C.surface}, 0px 0px 0px 4px ${hex}` } as object) : null,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Sign out */}
        <View style={{ paddingTop: 18, borderTopWidth: 1, borderTopColor: C.hair }}>
          <Kick color={C.ink3} style={{ marginBottom: 6 }}>
            Account
          </Kick>
          {isShared && role === 'member' && space && (
            <Press onPress={onLeaveSpace}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 }}>
                <Icon name="logOut" size={19} color={C.ink2} strokeWidth={1.8} />
                <T size={16.5} weight={500} color={C.ink2}>
                  Leave {space.name}
                </T>
              </View>
            </Press>
          )}
          <Press onPress={() => doSignOut()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 }}>
              <Icon name="logOut" size={19} color={C.accent} strokeWidth={1.8} />
              <T size={16.5} weight={500} color={C.accent}>
                Sign out
              </T>
            </View>
          </Press>
          <Div style={{ backgroundColor: C.hair }} />
          <Press onPress={onDeleteAccount}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 }}>
              <Icon name="trash" size={19} color={DANGER} strokeWidth={1.8} />
              <T size={16.5} weight={500} color={DANGER}>
                Delete account
              </T>
            </View>
          </Press>
        </View>

        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Kick color={C.ink4}>Pacto · v0.1</Kick>
        </View>
      </ScrollView>
    </View>
  );
}
