import { useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { Id } from '@cvx/_generated/dataModel';
import { useColors } from '@/theme';
import { RADII } from '@/theme/tokens';
import { Serif, T, Kick, GhostBtn, PrimaryBtn, RoundBtn, Mono } from '@/ui';
import { SheetShell, QField, QChips } from '@/features/sheets/parts';

const TYPES = ['Pair', 'Crew'] as const;

export default function NewSpace() {
  const C = useColors();
  const router = useRouter();
  const createSpace = useMutation(api.spaces.createSpace);
  const seed = useMutation(api.seed.seedSpace);
  const createInvite = useMutation(api.invites.createInvite);

  const [type, setType] = useState<string>('Crew');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ code: string; link: string; name: string } | null>(null);
  // createSpace already switched the active space, so a retry must resume the
  // seed → invite chain on this id instead of creating a duplicate space.
  const spaceIdRef = useRef<Id<'spaces'> | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const t = type === 'Pair' ? 'pair' : 'crew';
      const spaceId = spaceIdRef.current ?? (await createSpace({ type: t, name: name.trim() }));
      spaceIdRef.current = spaceId;
      await seed({ spaceId, tzOffset: new Date().getTimezoneOffset() });
      const inv = await createInvite({ spaceId });
      setInvite({ code: inv.code, link: inv.link, name: name.trim() || (t === 'pair' ? 'Our pact' : 'The crew') });
    } catch {
      setError("Couldn't create the space — try again.");
    } finally {
      setBusy(false);
    }
  };

  // Step 2 — created; show the invite code to share. The new space is already active.
  if (invite) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface }}>
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
              You&apos;re all set
            </Kick>
            <Serif size={34} numberOfLines={1}>
              {invite.name}
            </Serif>
          </View>
          <RoundBtn name="x" accessibilityLabel="Close" onPress={() => router.replace('/')} />
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 8, flex: 1 }}>
          <T size={15.5} weight={450} color={C.ink2} lh={1.5} style={{ marginBottom: 22 }}>
            Invite people with this code. They can enter it when they sign up, or anytime from Your spaces — or just
            tap your link.
          </T>

          <View style={{ padding: 20, borderRadius: RADII.cardSm, backgroundColor: C.surface2, alignItems: 'center' }}>
            <Kick color={C.ink3}>Invite code</Kick>
            <Mono size={48} weight={600} style={{ marginTop: 6, letterSpacing: 3 }}>
              {invite.code}
            </Mono>
          </View>

          <GhostBtn
            icon="link"
            style={{ marginTop: 16 }}
            onPress={() =>
              Share.share({ message: `Join ${invite.name} on Pacto — code ${invite.code}\n${invite.link}` })
            }
          >
            Share invite
          </GhostBtn>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }}>
          <PrimaryBtn icon="arrowRight" onPress={() => router.replace('/')}>
            Go to {invite.name}
          </PrimaryBtn>
        </View>
      </View>
    );
  }

  return (
    <SheetShell
      kicker="New"
      title="Space"
      footerLabel={busy ? 'Creating…' : 'Create space'}
      onSubmit={submit}
      disabled={!name.trim() || busy}
      busy={busy}
      error={error}
    >
      <T size={15.5} weight={450} color={C.ink2} lh={1.5} style={{ marginBottom: 22 }}>
        Start a shared space alongside your own. You can switch between spaces anytime.
      </T>
      <QChips label="Type" options={[...TYPES]} value={type} onPick={setType} />
      <QField
        label={`Name your ${type.toLowerCase()}`}
        value={name}
        onChangeText={setName}
        placeholder={type === 'Pair' ? 'Our pact' : 'The crew'}
        big
      />
    </SheetShell>
  );
}
