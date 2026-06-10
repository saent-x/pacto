import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@cvx/_generated/api';
import { useColors } from '@/theme';
import { Kick, Press, MoodGlyph } from '@/ui';
import { MOODS } from '@/constants/moods';
import { useSpace } from '@/features/account/SpaceProvider';
import { SheetShell, QField } from '@/features/sheets/parts';

export default function NewCheckin() {
  const C = useColors();
  const router = useRouter();
  const { spaceId } = useSpace();
  const create = useMutation(api.checkins.createCheckin);
  const [mood, setMood] = useState('steady');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!spaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await create({ spaceId, mood, note: note.trim() || undefined });
      router.back();
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <SheetShell
      kicker="Today"
      title="Check in"
      footerLabel={busy ? 'Saving…' : 'Save check-in'}
      onSubmit={submit}
      disabled={busy}
      busy={busy}
      error={error}
    >
      <Kick style={{ marginBottom: 14 }}>How&apos;s today feeling?</Kick>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 }}>
        {MOODS.map((m) => {
          const on = mood === m.id;
          return (
            <Press key={m.id} onPress={() => setMood(m.id)} style={{ alignItems: 'center', gap: 8 }} haptic>
              <MoodGlyph mood={m.id} size={42} active={on} />
              <Kick color={on ? C.ink : C.ink3} style={{ fontSize: 10.5, letterSpacing: 0.3 }}>
                {m.label}
              </Kick>
            </Press>
          );
        })}
      </View>
      <QField label="A note (optional)" value={note} onChangeText={setNote} placeholder="What shaped today?" multiline />
    </SheetShell>
  );
}
