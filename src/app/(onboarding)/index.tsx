import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { Serif, T, Kick, PrimaryBtn, Press, Div, Icon } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { DISPLAY_NAME_LIMIT, normalizeDisplayNameInput, profileDisplayNameForInput } from '@/features/account/displayName';
import { getPendingInvite, clearPendingInvite } from '@/lib/pendingInvite';

type Mode = 'solo' | 'pair' | 'crew';

const MODES: { id: Mode; kicker: string; title: string; desc: string }[] = [
  { id: 'solo', kicker: 'Just me', title: 'Solo', desc: 'Pacts with yourself.' },
  { id: 'pair', kicker: 'Two of you', title: 'Pair', desc: 'A partner, friend, or roommate.' },
  { id: 'crew', kicker: 'Small group', title: 'Crew', desc: '3 to 8 people. House, family, crew.' },
];

export default function ChooseMode() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useSpace();
  const updateProfile = useMutation(api.users.updateProfile);
  const ensureSolo = useMutation(api.spaces.ensureSoloSpace);
  const createSpace = useMutation(api.spaces.createSpace);
  const seed = useMutation(api.seed.seedSpace);
  const redeem = useMutation(api.invites.redeemInvite);

  const [sel, setSel] = useState<Mode | null>(null);
  const [displayNameDraft, setDisplayName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const displayName = displayNameDraft ?? profileDisplayNameForInput(user?.displayName, user?.email);
  const cleanDisplayName = useMemo(() => normalizeDisplayNameInput(displayName), [displayName]);

  // Arrived here via a pacto://join/<code> deep link while signed out → prefill.
  useEffect(() => {
    getPendingInvite().then((c) => {
      if (c) {
        setCode(c);
        setShowCode(true);
      }
    });
  }, []);

  const start = async () => {
    if (!sel || !cleanDisplayName || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ displayName: cleanDisplayName });
      const spaceId =
        sel === 'solo'
          ? await ensureSolo({})
          : await createSpace({ type: sel, name: sel === 'pair' ? 'Our pact' : 'The crew' });
      await seed({ spaceId, tzOffset: new Date().getTimezoneOffset() });
      // The auth gate redirects to (tabs) once the active space is set.
    } catch {
      setError('Something went wrong. Try again.');
      setBusy(false);
    }
  };

  const join = async () => {
    if (!code.trim() || !cleanDisplayName || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ displayName: cleanDisplayName });
      await redeem({ code: code.trim() });
      clearPendingInvite();
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      setError(
        msg.includes('INVALID_CODE')
          ? 'That code is not valid.'
          : msg.includes('EXPIRED')
            ? 'That invite has expired.'
            : msg.includes('FULL')
              ? 'That space is already full.'
              : 'Could not join with that code.',
      );
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28 }}
      >
        <View style={{ paddingTop: insets.top + 24 }}>
          <Kick color={C.accent}>Start your pact</Kick>
          <Serif size={46} style={{ marginTop: 6 }}>
            welcome
          </Serif>
          <T size={16} weight={450} color={C.ink2} style={{ marginTop: 8 }}>
            What should we call you?
          </T>
        </View>

        <View style={{ marginTop: 24 }}>
          <Kick style={{ marginBottom: 8 }}>Display name</Kick>
          <TextInput
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v);
              setError(null);
            }}
            placeholder="Your name"
            placeholderTextColor={C.ink2}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            returnKeyType="next"
            maxLength={DISPLAY_NAME_LIMIT}
            style={{
              fontFamily: FONTS.sans500,
              fontSize: 18,
              color: C.ink,
              paddingBottom: 10,
              borderBottomWidth: 1.5,
              borderBottomColor: cleanDisplayName ? C.accent : C.line,
            }}
          />
        </View>

        <View style={{ marginTop: 24, flex: 1 }}>
          {/* Joining ignores the mode picker entirely, so hide it behind the code form. */}
          {!showCode && (
            <T size={16} weight={450} color={C.ink2} style={{ marginBottom: 4 }}>
              What kind of pact are you starting?
            </T>
          )}
          {!showCode && MODES.map((m, i) => {
            const on = sel === m.id;
            return (
              <View key={m.id}>
                {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
                <Press onPress={() => setSel(m.id)}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 16,
                      paddingVertical: 18,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Kick color={on ? C.accent : C.ink3}>{m.kicker}</Kick>
                      <Serif size={28} style={{ marginTop: 2 }}>
                        {m.title}
                      </Serif>
                      <T size={14} weight={450} color={C.ink2} style={{ marginTop: 2 }}>
                        {m.desc}
                      </T>
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 24,
                        borderWidth: 1.6,
                        borderColor: on ? C.accent : C.line,
                        backgroundColor: on ? C.accent : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on && <Icon name="check" size={13} color={C.onAccent} strokeWidth={3} />}
                    </View>
                  </View>
                </Press>
              </View>
            );
          })}

          {showCode && (
            <View>
              <T size={16} weight={450} color={C.ink2} style={{ marginBottom: 16 }}>
                Joining with an invite
              </T>
              <Kick style={{ marginBottom: 8 }}>Invite code</Kick>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="ABC-123"
                placeholderTextColor={C.ink2}
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  fontFamily: FONTS.mono600,
                  fontSize: 18,
                  letterSpacing: 1,
                  color: C.ink,
                  paddingBottom: 10,
                  borderBottomWidth: 1.5,
                  borderBottomColor: code ? C.accent : C.line,
                }}
              />
            </View>
          )}

          {error && (
            <T selectable size={13.5} weight={500} color={C.danger} style={{ marginTop: 12 }}>
              {error}
            </T>
          )}
        </View>

        <View style={{ paddingBottom: insets.bottom + 24, gap: 14 }}>
          {showCode ? (
            <PrimaryBtn icon="arrowRight" onPress={join} disabled={!code.trim() || !cleanDisplayName || busy}>
              {busy ? 'Joining…' : 'Join space'}
            </PrimaryBtn>
          ) : (
            <PrimaryBtn icon="arrowRight" onPress={start} disabled={!sel || !cleanDisplayName || busy}>
              {busy ? 'Setting up…' : 'Continue'}
            </PrimaryBtn>
          )}
          <Press
            onPress={() => {
              setShowCode((s) => !s);
              setError(null);
            }}
            style={{ alignSelf: 'center' }}
          >
            <T size={13.5} weight={600} color={C.ink2}>
              {showCode ? 'Start a new pact instead' : 'Already have an invite code? →'}
            </T>
          </Press>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
