import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  BlockCard,
  DateSectioned,
  Display,
  IconTile,
  Overline,
} from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { SubHeader } from '@/src/components/ui/SubHeader';
import { useTheme } from '@/src/lib/theme';

type Plan = {
  t: string;
  sub: string;
  color: string;
  ink: string;
  prog: number;
  tag: string;
  items: string;
  bucket: 'This month' | 'Ongoing' | 'Later this year' | 'Someday';
  icon: IconName;
};

export default function PlansScreen() {
  const { C, F } = useTheme();

  const plans: Plan[] = [
    { t: 'Venice weekend', sub: '3 days · this Fri', color: C.sky, ink: C.skyInk, prog: 0.8, tag: 'SOON', items: '12 tasks · 8 done', bucket: 'This month', icon: 'mapPin' },
    { t: 'Summer road trip', sub: 'Aug · Amalfi → Sicily', color: C.peach, ink: C.peachInk, prog: 0.35, tag: 'AUG', items: '18 tasks · 6 done', bucket: 'This month', icon: 'compass' },
    { t: 'Learn to make fresh pasta', sub: 'weekends', color: C.butter, ink: C.butterInk, prog: 0.5, tag: 'ONGOING', items: '6 tasks · 3 done', bucket: 'Ongoing', icon: 'coffee' },
    { t: "Sofia's birthday surprise", sub: 'Sep 14', color: C.rose, ink: C.roseInk, prog: 0.15, tag: 'SEP', items: '9 tasks · 1 done', bucket: 'Later this year', icon: 'gift' },
    { t: 'Buy the apartment', sub: 'target: late 2026', color: C.mint, ink: C.mintInk, prog: 0.25, tag: '8 MONTHS', items: '23 tasks · 5 done', bucket: 'Later this year', icon: 'home' },
    { t: 'Vow renewal · 5 yrs', sub: 'April 2028', color: C.lavender, ink: C.lavenderInk, prog: 0.05, tag: 'DREAMY', items: '0 tasks · 0 done', bucket: 'Someday', icon: 'star' },
    { t: 'Year-long sabbatical', sub: '2029', color: C.sky, ink: C.skyInk, prog: 0.02, tag: 'BIG', items: 'Idea stage', bucket: 'Someday', icon: 'compass' },
  ];

  const totalTasks = plans.reduce((a, p) => {
    const m = /(\d+) tasks/.exec(p.items);
    return a + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  const totalDone = plans.reduce((a, p) => {
    const m = /(\d+) done/.exec(p.items);
    return a + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  const avgProg = plans.reduce((a, p) => a + p.prog, 0) / plans.length;

  const bucketColor: Record<Plan['bucket'], string> = useMemo(
    () => ({
      'This month': C.peach,
      Ongoing: C.butter,
      'Later this year': C.mint,
      Someday: C.lavender,
    }),
    [C]
  );
  const bucketOrder: Plan['bucket'][] = ['This month', 'Ongoing', 'Later this year', 'Someday'];
  const sections = bucketOrder
    .map((b) => ({
      label: b.toUpperCase(),
      color: bucketColor[b],
      items: plans.filter((p) => p.bucket === b),
    }))
    .filter((s) => s.items.length);

  const renderPlan = (p: Plan) => (
    <View
      key={p.t}
      style={{
        backgroundColor: p.color,
        borderRadius: 24,
        padding: 22,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              color: p.ink,
              fontFamily: F.bodyBold,
              letterSpacing: 1.4,
              opacity: 0.55,
              marginBottom: 4,
            }}
          >
            {p.tag}
          </Text>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 22,
              color: p.ink,
              letterSpacing: -0.6,
              lineHeight: 24,
            }}
          >
            {p.t}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: p.ink,
              opacity: 0.65,
              fontFamily: F.body,
              marginTop: 3,
            }}
          >
            {p.sub}
          </Text>
        </View>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={p.icon} size={18} color={p.ink} strokeWidth={2} />
        </View>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: 'rgba(0,0,0,0.12)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${p.prog * 100}%`, height: '100%', backgroundColor: p.ink }} />
      </View>
      <View
        style={{
          marginTop: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: p.ink,
            fontFamily: F.bodyBold,
            letterSpacing: 0.6,
            opacity: 0.65,
          }}
        >
          {p.items}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: p.ink,
            fontFamily: F.bodyBold,
            letterSpacing: 0.6,
            opacity: 0.65,
          }}
        >
          {Math.round(p.prog * 100)}%
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <BlockCard bg={C.sky} ink={C.skyInk} style={{ padding: 22, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Overline color="rgba(14,34,48,0.7)">Things we're building</Overline>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
              <Display size={54} color={C.skyInk}>{`${plans.length}`}</Display>
              <Text
                style={{
                  fontSize: 14,
                  color: 'rgba(14,34,48,0.6)',
                  fontFamily: F.bodyBold,
                  marginBottom: 8,
                }}
              >
                plans
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: 'rgba(14,34,48,0.7)',
                marginTop: 6,
                fontFamily: F.body,
              }}
            >
              {totalDone} of {totalTasks} tasks done · {Math.round(avgProg * 100)}% avg progress
            </Text>
          </View>
          <IconTile
            icon="compass"
            bg="rgba(14,34,48,0.15)"
            color={C.skyInk}
            size={44}
            radius={14}
            iconSize={20}
          />
        </View>
        <View
          style={{
            marginTop: 16,
            height: 6,
            backgroundColor: 'rgba(14,34,48,0.15)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <View style={{ width: `${avgProg * 100}%`, height: '100%', backgroundColor: C.skyInk }} />
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          {['SOON 2', 'ONGOING 1', 'LATER 2', 'SOMEDAY 2'].map((t) => (
            <Text
              key={t}
              style={{
                fontSize: 10,
                fontFamily: F.bodyBold,
                letterSpacing: 0.5,
                color: 'rgba(14,34,48,0.75)',
              }}
            >
              {t}
            </Text>
          ))}
        </View>
      </BlockCard>

      <DateSectioned sections={sections} maxOpen={3} renderItem={renderPlan} />
    </Screen>
  );
}
