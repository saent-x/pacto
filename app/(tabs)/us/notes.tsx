import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import {
  RowActionMenu,
  type ActionMenuItem,
  type ActionMenuPayload,
} from '@/src/components/ui/RowActionMenu';
import { confirmDestructive } from '@/src/lib/confirm';
import { useLoveNotes } from '@/src/hooks/useLoveNotes';
import { useSession } from '@/src/hooks/useSession';
import { useTheme } from '@/src/lib/theme';

type NoteRow = {
  id: string;
  body: string;
  authorId: string;
  createdAt: number;
};

// solo-mode: full screen replaced with empty state — partner required
export default function LoveNotes() {
  const { C, F } = useTheme();
  const { user, partner, isSolo } = useSession();
  const { notes, isLoading, remove } = useLoveNotes();
  if (isSolo) return <SoloNotesEmpty />;

  const buildNoteMenu = useCallback(
    (note: NoteRow, isMine: boolean): ActionMenuPayload => {
      const baseActions: ActionMenuItem[] = [
        {
          key: 'delete',
          label: 'Delete',
          icon: 'trash',
          destructive: true,
          onPress: () => {
            confirmDestructive(
              'Delete note?',
              'This love note will be removed.',
              () => remove(note.id),
            );
          },
        },
      ];
      return {
        title: note.body.length > 40 ? `${note.body.slice(0, 40)}…` : note.body,
        subtitle: format(new Date(note.createdAt), 'MMM d · h:mm a'),
        actions: isMine
          ? [
              {
                key: 'edit',
                label: 'Edit',
                icon: 'edit',
                onPress: () => router.push(`/sheets/new-note?id=${note.id}` as any),
              },
              ...baseActions,
            ]
          : baseActions,
      };
    },
    [remove],
  );

  const userId = user?.id ?? null;
  const partnerName = partner?.displayName ?? 'Partner';

  const sorted = useMemo<NoteRow[]>(
    () =>
      [...notes]
        .map((n) => ({
          id: n.id,
          body: (n as { body: string }).body,
          authorId: (n as { authorId: string }).authorId,
          createdAt: Number((n as { createdAt: number }).createdAt ?? 0),
        }))
        .sort((a, b) => b.createdAt - a.createdAt),
    [notes],
  );

  const featured = useMemo(
    () => (isSolo ? null : sorted.find((n) => n.authorId !== userId) ?? null),
    [isSolo, sorted, userId],
  );
  const timeline = featured ? sorted.filter((n) => n.id !== featured.id) : sorted;

  const hasAny = sorted.length > 0;
  if (isLoading && !hasAny) return <IndexSkeleton />;
  if (!hasAny) return <EmptyNotes />;

  return (
    <Screen>
      {featured ? (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{ marginBottom: 18 }}
        >
        <RowActionMenu {...buildNoteMenu(featured, featured.authorId === userId)}>
        <Pressable
          testID={`note-bubble-${featured.id}`}
          style={{ backgroundColor: C.rose, borderRadius: 24, padding: 22 }}
        >
          <Text
            style={{
              fontSize: 10,
              color: C.roseInk,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              opacity: 0.55,
              marginBottom: 10,
            }}
          >
            {`FROM ${partnerName.toUpperCase()} · ${format(new Date(featured.createdAt), 'h:mm a')}`}
          </Text>
          <Text
            style={{
              fontFamily: F.serif,
              fontStyle: 'italic',
              fontSize: 19,
              color: C.roseInk,
              lineHeight: 26,
              letterSpacing: -0.2,
            }}
          >
            {`"${featured.body}"`}
          </Text>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
            {['♥ REACT', 'REPLY'].map((t) => (
              <View
                key={t}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.14)',
                }}
              >
                <Text
                  style={{
                    color: C.roseInk,
                    fontSize: 11,
                    fontFamily: F.bodyBold,
                    letterSpacing: 0.8,
                  }}
                >
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
        </RowActionMenu>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <Text
          style={{
            fontSize: 11,
            color: C.fog,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            paddingLeft: 4,
            marginBottom: 10,
          }}
        >
          {isSolo ? 'YOUR NOTES' : 'EARLIER'}
        </Text>
      </Animated.View>

      {timeline.map((n, i) => {
        const me = n.authorId === userId;
        return (
          <Animated.View
            key={n.id}
            entering={FadeInDown.delay(Math.min(i, 10) * 60 + 140).duration(380)}
            style={{
              flexDirection: 'row',
              justifyContent: me ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <RowActionMenu {...buildNoteMenu(n, me)}>
            <Pressable
              testID={`note-bubble-${n.id}`}
              style={{
                maxWidth: '80%',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 18,
                backgroundColor: me ? C.butterInk : C.card,
                borderWidth: me ? 0 : 1,
                borderColor: C.line,
                borderBottomRightRadius: me ? 6 : 18,
                borderBottomLeftRadius: me ? 18 : 6,
              }}
            >
              <Text
                style={{
                  fontFamily: F.serif,
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: me ? C.butter : C.bone,
                  lineHeight: 20,
                }}
              >
                {n.body}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: C.fog,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.8,
                  marginTop: 6,
                }}
              >
                {format(new Date(n.createdAt), 'EEE · h:mm a')}
              </Text>
            </Pressable>
            </RowActionMenu>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

function EmptyNotes() {
  const { C, F } = useTheme();
  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/sheets/new-note')}
        style={{
          marginTop: 4,
          padding: 24,
          borderRadius: 22,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: C.line,
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="heart" size={22} color={C.fog} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.mist }}>
          No notes yet
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: C.fog,
            fontFamily: F.body,
            textAlign: 'center',
          }}
        >
          Leave a first one. A sentence is enough.
        </Text>
      </Pressable>
    </Screen>
  );
}

function SoloNotesEmpty() {
  const { C, F } = useTheme();
  return (
    <Screen>
      <View
        testID="love-notes-solo-empty"
        style={{
          marginTop: 4,
          padding: 28,
          borderRadius: 22,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: C.line,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon name="heart" size={26} color={C.fog} />
        <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.mist }}>
          Love notes need a partner
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: C.fog,
            fontFamily: F.body,
            textAlign: 'center',
            lineHeight: 19,
          }}
        >
          Invite someone from settings to start sending notes.
        </Text>
      </View>
    </Screen>
  );
}

function IndexSkeleton() {
  const { C } = useTheme();
  return (
    <Screen>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          height: 168,
          borderRadius: 24,
          backgroundColor: C.rose,
          opacity: 0.35,
          marginBottom: 18,
        }}
      />
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(80 + i * 60).duration(300)}
          style={{
            alignSelf: i % 2 ? 'flex-start' : 'flex-end',
            width: '70%',
            height: 56,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 10,
            opacity: 0.55,
          }}
        />
      ))}
    </Screen>
  );
}
