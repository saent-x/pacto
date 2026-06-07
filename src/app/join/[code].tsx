import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import { Serif, Kick, T, PrimaryBtn } from '@/ui';
import { clearPendingInvite, inviteErrorMessage } from '@/lib/pendingInvite';

// Reached via the deep link pacto://join/<code> once the user is authenticated.
// (Capture-while-signed-out is handled in the root layout, which stashes the code
// and routes here after sign-in.)
export default function JoinByCode() {
  const C = useColors();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const redeem = useMutation(api.invites.redeemInvite);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await redeem({ code });
        clearPendingInvite();
        if (!cancelled) router.replace('/');
      } catch (e) {
        clearPendingInvite();
        if (!cancelled) setError(inviteErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, redeem, router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {!error ? (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={C.accent} />
          <Kick color={C.accent}>Joining</Kick>
          <Serif size={30}>One moment…</Serif>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Kick color={C.accent}>Invite</Kick>
          <Serif size={30} style={{ textAlign: 'center' }}>
            Couldn&apos;t join
          </Serif>
          <T size={15.5} weight={450} color={C.ink2} style={{ textAlign: 'center' }}>
            {error}
          </T>
          <PrimaryBtn icon="arrowRight" onPress={() => router.replace('/')} style={{ marginTop: 8, alignSelf: 'stretch' }}>
            Continue to Pacto
          </PrimaryBtn>
        </View>
      )}
    </View>
  );
}
