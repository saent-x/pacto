import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Avatar, AvatarPair, Card, CrewStack, Pill } from '@/src/components/ui/pacto';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { DEFAULT_AVATARS, type DefaultAvatarId } from '@/src/constants/defaultAvatars';
import { Typography } from '@/src/constants/typography';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { updateUserAvatar, updateUserProfile, uploadAvatarFromUri } from '@/src/lib/space-actions';

export default function AccountSheet() {
  const { C } = useTheme();
  const navRouter = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.status === 'unauthed') {
      navRouter.replace('/(auth)/sign-in' as any);
    }
  }, [session.status, navRouter]);

  const savedDisplayName = session.user?.displayName?.trim() ?? '';
  const [displayNameDraft, setDisplayNameDraft] = useState(savedDisplayName);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setDisplayNameDraft(savedDisplayName);
  }, [session.user?.id, savedDisplayName]);

  const trimmedDisplayName = displayNameDraft.trim();
  const canSaveDisplayName =
    !!session.user &&
    trimmedDisplayName.length > 0 &&
    trimmedDisplayName !== savedDisplayName &&
    !savingName;

  const me =
    trimmedDisplayName ||
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

  const statusLine = isSolo
    ? 'Solo pact'
    : isCrew
    ? session.space?.name ?? 'Crew pact'
    : `Paired with ${partnerName ?? 'someone'}`;

  async function onSelectAvatar(avatarUrl: string) {
    if (!session.user) return;
    Haptics.selectionAsync().catch(() => undefined);
    try {
      await updateUserAvatar({ userId: session.user.id, avatarUrl });
    } catch (err) {
      console.warn('[account] avatar update failed', err);
      Alert.alert('Avatar update failed', 'Try again.');
    }
  }

  async function onSaveDisplayName() {
    if (!session.user || !canSaveDisplayName) return;
    Haptics.selectionAsync().catch(() => undefined);
    setSavingName(true);
    try {
      await updateUserProfile({
        userId: session.user.id,
        displayName: trimmedDisplayName,
      });
    } catch (err) {
      console.warn('[account] display name update failed', err);
      Alert.alert('Name update failed', 'Try again.');
    } finally {
      setSavingName(false);
    }
  }

  async function onUploadAvatar() {
    if (!session.user) return;
    Haptics.selectionAsync().catch(() => undefined);
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo access to choose a custom avatar.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    try {
      const url = await uploadAvatarFromUri({
        userId: session.user.id,
        uri: asset.uri,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      await onSelectAvatar(url);
    } catch (err) {
      console.warn('[account] avatar upload failed', err);
      Alert.alert('Upload failed', 'Could not save your photo. Try again.');
    }
  }

  const rows = useMemo(() => {
    type Row = {
    label: string;
    value: string;
    icon: IconName;
    muted?: boolean;
    testID?: string;
    };
    return [
      {
        label: 'Email',
        value: session.user?.email ?? '—',
        icon: 'mail' as const,
        muted: true,
        testID: 'account-row-email',
      },
    ] satisfies Row[];
  }, [session.user?.email]);

  return (
    <SheetShell eyebrow="ACCOUNT" title="account">
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
        <View style={[styles.nameEditor, { borderBottomColor: C.lineColor }]}>
          <Text style={[Typography.eyebrowSm, { color: C.ink3 }]}>Display name</Text>
          <View style={styles.nameEditorRow}>
            <TextInput
              testID="account-display-name-input"
              value={displayNameDraft}
              onChangeText={setDisplayNameDraft}
              placeholder="Your name"
              placeholderTextColor={C.ink3}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={onSaveDisplayName}
              style={[
                Typography.body,
                styles.nameInput,
                { color: C.inkColor, borderBottomColor: C.lineColor },
              ]}
            />
            <PressScale
              testID="account-save-display-name"
              onPress={onSaveDisplayName}
              disabled={!canSaveDisplayName}
              style={[
                styles.saveNameButton,
                {
                  backgroundColor: canSaveDisplayName ? C.accent : C.bgSoft,
                  borderColor: canSaveDisplayName ? C.accent : C.lineColor,
                },
              ]}
            >
              <Text style={[Typography.captionMedium, { color: canSaveDisplayName ? C.bg : C.ink3 }]}>
                {savingName ? 'Saving' : 'Save'}
              </Text>
            </PressScale>
          </View>
          {!trimmedDisplayName ? (
            <Text style={[Typography.small, { color: C.error, marginTop: 6 }]}>
              Add a display name so shared actions are clearly attributed.
            </Text>
          ) : null}
        </View>
        <View style={styles.avatarPicker}>
          <View style={styles.avatarChoices}>
            {DEFAULT_AVATARS.map((avatar) => {
              const selected = selectedAvatar === avatar.id;
              return (
                <PressScale
                  key={avatar.id}
                  testID={`account-avatar-${avatar.id}`}
                  onPress={() => onSelectAvatar(avatar.id)}
                  style={[
                    styles.avatarSlot,
                    selected
                      ? { borderColor: C.accent }
                      : { borderColor: 'transparent' },
                  ]}
                >
                  <Avatar
                    person={{ avatarUrl: avatar.id, color: C.accent }}
                    size={40}
                  />
                </PressScale>
              );
            })}
            <PressScale
              testID="account-avatar-upload"
              onPress={onUploadAvatar}
              style={[
                styles.avatarSlot,
                styles.uploadSlot,
                { borderColor: C.lineColor },
              ]}
            >
              <Icon
                name="plus"
                size={18}
                color={C.ink2}
                strokeWidth={2.2}
              />
            </PressScale>
          </View>
        </View>
      </Card>

      <Card padded={false}>
        {rows.map((r, i) => (
          <View
            key={r.label}
            testID={r.testID}
            style={[
              styles.row,
              i < rows.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: C.lineColor }
                : null,
            ]}
          >
            <Icon name={r.icon} size={18} color={C.ink3} strokeWidth={1.8} />
            <Text style={[Typography.body, { flex: 1, color: C.inkColor }]}>
              {r.label}
            </Text>
            <Text
              style={[Typography.body, { color: r.muted ? C.ink3 : C.ink2 }]}
              numberOfLines={1}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </Card>
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
  nameEditor: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  nameEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    minHeight: 42,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  saveNameButton: {
    minWidth: 72,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
    justifyContent: 'center',
  },
  avatarSlot: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadSlot: {
    borderStyle: 'dashed',
  },
});
