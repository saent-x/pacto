import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  AvatarPair,
  Card,
  CrewStack,
  HeaderBrand,
  PactoMark,
} from '@/src/components/ui/pacto';
import { Icon } from '@/src/components/ui/Icon';
import { PressScale } from '@/src/components/ui/PressScale';
import { PulsingDot } from '@/src/components/ui/pacto/PulsingDot';
import { Typography } from '@/src/constants/typography';
import { DEFAULT_AVATARS } from '@/src/constants/defaultAvatars';
import { useTheme } from '@/src/lib/theme';

type Mode = 'solo' | 'pair' | 'crew';

export default function Onboarding() {
  const router = useRouter();
  const { C } = useTheme();
  const [mode, setMode] = useState<Mode | null>(null);

  function pick(mode: Mode) {
    setMode(mode);
  }

  function continueToFeatures() {
    if (!mode) return;
    router.push({ pathname: '/(auth)/onboarding-features', params: { mode } } as any);
  }

  function goJoin() {
    router.push('/(auth)/invite' as any);
  }

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={[styles.root, { backgroundColor: C.bg }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <PactoMark size={56} />
        <View style={{ height: 16 }} />
        <HeaderBrand eyebrow="START YOUR PACT" title="welcome" size={32} />
        <Text
          style={[
            Typography.body,
            { color: C.ink2, marginTop: 14, textAlign: 'center', maxWidth: 300 },
          ]}
        >
          What kind of pact are you starting?
        </Text>
      </View>

      <View style={styles.cards}>
        <ModeCard
          eyebrow="JUST ME"
          title="Solo"
          description="Pacts with yourself."
          accent={C.accent}
          left={<Avatar person={{ avatarUrl: DEFAULT_AVATARS[0].id, color: C.accent }} size={36} />}
          selected={mode === 'solo'}
          testID="onboarding-mode-solo"
          onPress={() => pick('solo')}
        />

        <ModeCard
          eyebrow="TWO OF YOU"
          title="Pair"
          description="Any two-person bond: partner, friend, or roommate."
          accent={C.accent2}
          left={
            <AvatarPair
              a={{ avatarUrl: DEFAULT_AVATARS[1].id, color: C.accent }}
              b={{ avatarUrl: DEFAULT_AVATARS[2].id, color: C.accent2 }}
              size={32}
            />
          }
          selected={mode === 'pair'}
          testID="onboarding-mode-pair"
          onPress={() => pick('pair')}
        />

        <ModeCard
          eyebrow="SMALL GROUP"
          title="Crew"
          description="3 to 8 people. House, family, project crew."
          accent={C.accent3}
          left={<CrewStack size={28} />}
          selected={mode === 'crew'}
          testID="onboarding-mode-crew"
          onPress={() => pick('crew')}
        />
      </View>

      <PressScale
        testID="onboarding-continue"
        onPress={continueToFeatures}
        disabled={!mode}
        accessibilityLabel="Continue onboarding"
        style={[
          styles.createButton,
          {
            backgroundColor: mode ? C.accent : C.line2,
            opacity: mode ? 1 : 0.62,
          },
        ]}
        haptic="selection"
      >
        <Text style={[Typography.bodyMedium, { color: mode ? C.bg : C.ink3 }]}>
          Continue
        </Text>
        <Icon name="arrowRight" size={16} color={mode ? C.bg : C.ink3} />
      </PressScale>

      <PressScale
        onPress={goJoin}
        style={styles.joinLink}
        accessibilityLabel="Enter an invite code"
      >
        <Text style={[Typography.captionMedium, { color: C.ink2 }]}>
          Already have an invite code?
        </Text>
        <Icon name="arrowRight" size={14} color={C.ink2} />
      </PressScale>
    </ScrollView>
  );
}

function ModeCard({
  eyebrow,
  title,
  description,
  accent,
  left,
  selected,
  testID,
  onPress,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  left: React.ReactNode;
  selected: boolean;
  testID: string;
  onPress: () => void;
}) {
  const { C } = useTheme();
  return (
    <PressScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ selected }}
    >
      <Card
        style={[
          styles.modeCard,
          selected
            ? { borderColor: accent, backgroundColor: C.bgSoft }
            : { backgroundColor: C.bgCard },
        ]}
      >
        <View style={styles.modeRow}>
          <View style={styles.modeLeft}>{left}</View>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.eyebrowSm, { color: accent }]}>{eyebrow}</Text>
            <Text
              style={[
                {
                  fontFamily: Typography.pixelFont,
                  fontSize: 22,
                  lineHeight: 24,
                  color: C.inkColor,
                  letterSpacing: -0.3,
                  marginTop: 4,
                },
              ]}
            >
              {title}
              <PulsingDot color={accent} />
            </Text>
            <Text style={[Typography.caption, { color: C.ink2, marginTop: 6 }]}>
              {description}
            </Text>
          </View>
          <Icon name={selected ? 'check' : 'arrowRight'} size={16} color={selected ? accent : C.ink3} />
        </View>
      </Card>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 60 },
  hero: { alignItems: 'center', marginBottom: 32 },
  cards: { gap: 12 },
  modeCard: { padding: 18, borderRadius: 8 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  modeLeft: {
    width: 64,
    alignItems: 'center',
  },
  createButton: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  joinLink: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
});
