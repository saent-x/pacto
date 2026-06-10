import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { Serif, T, Kick, Div, Icon, Press, RoundBtn, PrimaryBtn, Mono } from '@/ui';
import { useSpace } from '@/features/account/SpaceProvider';
import { inviteErrorMessage } from '@/lib/pendingInvite';

const TYPE_LABEL: Record<string, string> = { solo: 'Just me', pair: 'Pair', crew: 'Crew' };
const TYPE_ICON: Record<string, 'user' | 'users'> = { solo: 'user', pair: 'users', crew: 'users' };

export default function Spaces() {
  const C = useColors();
  const router = useRouter();
  const { space } = useSpace();
  const mySpaces = useQuery(api.spaces.mySpaces, {});
  const switchSpace = useMutation(api.spaces.setActiveSpace);
  const redeem = useMutation(api.invites.redeemInvite);

  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const spaces = mySpaces ?? [];

  const pick = async (id: string) => {
    if (id === space?.id) {
      router.back();
      return;
    }
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await switchSpace({ spaceId: id as any });
      router.back();
    } catch {
      setErr("Couldn't switch spaces — try again.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await redeem({ code: code.trim() });
      router.back();
    } catch (e) {
      setErr(inviteErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <View style={{ backgroundColor: C.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 10,
        }}
      >
        <View>
          <Kick color={C.accent} style={{ marginBottom: 6 }}>
            Switch
          </Kick>
          <Serif size={34}>Your spaces</Serif>
        </View>
        <RoundBtn name="x" onPress={() => router.back()} accessibilityLabel="Close" />
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 }}>
        {mySpaces === undefined && (
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
          </View>
        )}
        {spaces.map((s, i) => {
          const active = s.spaceId === space?.id;
          return (
            <View key={s.spaceId}>
              {i > 0 && <Div style={{ backgroundColor: C.hair }} />}
              <Press onPress={() => pick(s.spaceId)} haptic accessibilityState={{ selected: active }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 44,
                      backgroundColor: active ? C.accent : C.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={TYPE_ICON[s.type] ?? 'users'}
                      size={20}
                      color={active ? C.onAccent : C.ink2}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T size={17} weight={600} numberOfLines={1}>
                      {s.name}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Kick color={C.ink3}>{TYPE_LABEL[s.type] ?? s.type} ·</Kick>
                      <Mono size={11} weight={600} color={C.ink3} lh={1}>
                        {s.memberCount}/{s.cap}
                      </Mono>
                      {s.role === 'owner' && <Kick color={C.ink3}>· Owner</Kick>}
                    </View>
                  </View>
                  {active && <Icon name="check" size={20} color={C.accent} strokeWidth={2.4} />}
                </View>
              </Press>
            </View>
          );
        })}

        {/* A failed switch must surface even when the join form is collapsed. */}
        {err && !showCode && (
          <T size={13.5} weight={500} color={C.danger} style={{ marginTop: 10 }}>
            {err}
          </T>
        )}

        {/* Actions */}
        <View style={{ marginTop: 18, gap: 12 }}>
          <Press
            onPress={() => router.push('/new/space')}
            haptic
            style={{ borderRadius: 999, borderWidth: 1.4, borderColor: C.line }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15 }}>
              <Icon name="plus" size={18} color={C.ink} strokeWidth={2.1} />
              <T size={15.5} weight={600}>
                Start a new space
              </T>
            </View>
          </Press>

          {!showCode ? (
            <Press onPress={() => setShowCode(true)} style={{ alignSelf: 'center', paddingVertical: 6 }}>
              <T size={13.5} weight={600} color={C.ink2}>
                Join with a code →
              </T>
            </Press>
          ) : (
            <View style={{ gap: 12 }}>
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
              {err && (
                <T size={13.5} weight={500} color={C.danger}>
                  {err}
                </T>
              )}
              <PrimaryBtn icon="arrowRight" onPress={join} disabled={!code.trim() || busy}>
                {busy ? 'Joining…' : 'Join space'}
              </PrimaryBtn>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
