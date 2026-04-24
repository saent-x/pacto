import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { BlockCard, CouplRings, IconTile, Overline } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { SheetShell } from '@/src/components/ui/SheetShell';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/lib/session';
import { db } from '@/src/lib/db';
import {
  leaveSpace,
  regenerateInviteCode,
  upgradeSoloToCouple,
} from '@/src/lib/space-actions';
import { useJournal } from '@/src/hooks/useJournal';
import { useMilestones } from '@/src/hooks/useMilestones';

export default function ProfileSheet() {
  const { C, F, mode, setMode } = useTheme();
  const navRouter = useRouter();
  const session = useSession();
  const { allEntries, isLoading: journalLoading } = useJournal();
  const { milestones, isLoading: milestonesLoading } = useMilestones();

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
  const coupleName = partnerName ? `${me} & ${partnerName}` : me;

  const anniversary = session.space?.anniversary
    ? parseISO(session.space.anniversary)
    : null;
  const daysTogether = anniversary
    ? Math.max(0, differenceInCalendarDays(new Date(), anniversary))
    : 0;
  const anniversaryLabel = anniversary
    ? format(anniversary, 'MMM d, yyyy').toUpperCase()
    : '—';

  const inviteCode = session.space?.inviteCode ?? null;
  const entriesCount = journalLoading ? null : allEntries.length;
  const milestonesCount = milestonesLoading ? null : milestones.length;

  async function onCopyCode() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function onInvitePartner() {
    if (!session.space || session.space.kind !== 'couple') return;
    let code = session.space.inviteCode;
    if (!code) {
      code = await regenerateInviteCode({ spaceId: session.space.id });
    }
    navRouter.push({ pathname: '/(auth)/invite-code', params: { code } } as any);
  }

  async function onUpgrade() {
    if (!session.space || session.space.kind !== 'solo') return;
    const code = await upgradeSoloToCouple({ spaceId: session.space.id });
    navRouter.push({ pathname: '/(auth)/invite-code', params: { code } } as any);
  }

  function onSignOut() {
    Alert.alert('Sign out?', 'You’ll need to sign in again to see your space.', [
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
      ? 'This deletes your solo space and everything in it. Cannot be undone.'
      : 'You will no longer see shared content. Your partner keeps the space.';
    Alert.alert('Leave this space?', msg, [
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

  const showPartnerRow = !session.isSolo;
  const rows: { icon: IconName; label: string; sub: string }[] = [
    { icon: 'user', label: 'Your profile', sub: session.user?.email ?? '—' },
    ...(showPartnerRow
      ? [
          {
            icon: 'heart' as IconName,
            label: 'Partner',
            sub: partnerName
              ? `${partnerName} · connected`
              : 'Tap to invite',
          },
        ]
      : []),
    { icon: 'bell', label: 'Notifications', sub: 'Reminders · Check-ins · Love notes' },
    {
      icon: 'lock',
      label: 'Privacy',
      sub: partnerName ? `What ${partnerName} can see` : 'Private for now',
    },
    { icon: 'arrowDown', label: 'Export your data', sub: 'Download everything as JSON' },
    { icon: 'helpCircle', label: 'Help & feedback', sub: 'hi@coupl.app' },
  ];

  return (
    <SheetShell eyebrow="PROFILE & SETTINGS" title="You & us.">
      <BlockCard bg={C.peach} ink={C.peachInk} style={{ padding: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <CouplRings size={56} a={C.peachInk} b={C.gold} />
          <View style={{ flex: 1 }}>
            <Text
              testID="profile-hero-meta"
              style={{
                fontSize: 10,
                fontFamily: F.bodyBold,
                letterSpacing: 1.2,
                color: C.peachInk,
                opacity: 0.6,
              }}
            >
              {`${daysTogether} DAYS TOGETHER · SINCE ${anniversaryLabel}`}
            </Text>
            <Text
              testID="profile-hero-name"
              style={{
                fontFamily: F.displayBold,
                fontSize: 22,
                color: C.peachInk,
                letterSpacing: -0.4,
                lineHeight: 24,
                marginTop: 2,
              }}
            >
              {coupleName}
            </Text>
            <Text
              testID="profile-hero-code"
              style={{
                fontSize: 11,
                color: C.peachInk,
                opacity: 0.7,
                fontFamily: F.body,
                marginTop: 2,
              }}
            >
              {`coupl code: ${inviteCode ?? '—'}`}
            </Text>
          </View>
          <Pressable
            testID="profile-copy-code"
            onPress={onCopyCode}
            disabled={!inviteCode}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(0,0,0,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: inviteCode ? 1 : 0.4,
            }}
          >
            <Icon name="copy" size={14} color={C.peachInk} />
          </Pressable>
        </View>
        <View
          style={{
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: 'rgba(58,31,20,0.18)',
          }}
        >
          {[
            { n: String(daysTogether), l: 'DAYS', id: 'days' },
            {
              n: entriesCount === null ? '—' : String(entriesCount),
              l: 'ENTRIES',
              id: 'entries',
            },
            {
              n: milestonesCount === null ? '—' : String(milestonesCount),
              l: 'MILESTONES',
              id: 'milestones',
            },
          ].map((s) => (
            <View key={s.l} testID={`profile-stat-${s.id}`} style={{ alignItems: 'center' }}>
              <Text
                testID={`profile-stat-${s.id}-value`}
                style={{ fontFamily: F.displayBold, fontSize: 22, color: C.peachInk }}
              >
                {s.n}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: C.peachInk,
                  opacity: 0.65,
                  fontFamily: F.bodyBold,
                  letterSpacing: 0.8,
                  marginTop: 2,
                }}
              >
                {s.l}
              </Text>
            </View>
          ))}
        </View>
      </BlockCard>

      <Overline style={{ marginBottom: 10 }}>Theme</Overline>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
        {(
          [
            { k: 'dark', label: 'Warm dusk', bg: '#1A0F0A', dot: C.gold },
            { k: 'light', label: 'Dawn cream', bg: '#F5EEE3', dot: C.rose },
          ] as const
        ).map((t) => {
          const sel = mode === t.k;
          return (
            <PressScale
              key={t.k}
              testID={`profile-theme-${t.k}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                setMode(t.k);
              }}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor: sel ? C.cardHi : C.card,
                borderWidth: 1,
                borderColor: sel ? C.gold : C.line,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: t.bg,
                  borderWidth: 1,
                  borderColor: C.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.dot }} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontFamily: F.bodyBold, color: C.bone }}>{t.label}</Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: F.bodyBold,
                    color: C.fog,
                    letterSpacing: 0.4,
                    marginTop: 2,
                  }}
                >
                  {sel ? 'ACTIVE' : 'TAP TO TRY'}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </View>

      <Overline style={{ marginBottom: 10 }}>Settings</Overline>
      <View
        style={{
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            testID={`profile-row-${r.icon}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1,
              borderBottomColor: C.line,
            }}
          >
            <IconTile icon={r.icon} bg={C.cardHi} color={C.gold} size={36} radius={10} iconSize={15} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: F.bodyBold, color: C.bone }}>{r.label}</Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, color: C.fog, marginTop: 2, fontFamily: F.body }}
              >
                {r.sub}
              </Text>
            </View>
            <Icon name="chevronRight" size={14} color={C.fog} />
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 2, marginTop: 24 }}>
        {session.isCouple && !session.partner && (
          <Pressable testID="profile-invite" onPress={onInvitePartner} style={rowStyle(C)}>
            <Icon name="send" size={16} color={C.gold} />
            <Text style={rowTextStyle(C, F)}>Invite partner</Text>
          </Pressable>
        )}
        {session.isSolo && (
          <Pressable testID="profile-upgrade" onPress={onUpgrade} style={rowStyle(C)}>
            <Icon name="users" size={16} color={C.gold} />
            <Text style={rowTextStyle(C, F)}>Upgrade to couple</Text>
          </Pressable>
        )}
        <Pressable testID="profile-signout" onPress={onSignOut} style={rowStyle(C)}>
          <Icon name="logOut" size={16} color={C.mist} />
          <Text style={rowTextStyle(C, F)}>Sign out</Text>
        </Pressable>
        <Pressable testID="profile-leave" onPress={onLeave} style={rowStyle(C)}>
          <Icon name="trash" size={16} color={C.error} />
          <Text style={[rowTextStyle(C, F), { color: C.error }]}>Leave space</Text>
        </Pressable>
      </View>
    </SheetShell>
  );
}

function rowStyle(C: any) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: C.card,
    borderRadius: 14,
  };
}

function rowTextStyle(C: any, F: any) {
  return { color: C.bone, fontFamily: F.body, fontSize: 15 };
}
