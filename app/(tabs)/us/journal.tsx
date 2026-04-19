import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar, BlockCard, Overline, RoundBtn, ScreenHeader } from '@/src/components/ui/atoms';
import { Icon, IconName } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';

type Entry = {
  id: number;
  date: string;
  title: string | null;
  body: string;
  mood: { icon: IconName; colorKey: 'mint' | 'rose' | 'sky' };
  author: 'me' | 'sofia';
  private: boolean;
};

const ENTRIES: Entry[] = [
  { id: 1, date: 'THU, APR 17', title: 'Morning light', body: 'The kitchen was glowing when I woke up. Sofia was still asleep. I made coffee quietly and watched the sun come in...', mood: { icon: 'sun', colorKey: 'mint' }, author: 'me', private: false },
  { id: 2, date: 'WED, APR 16', title: null, body: "Something I couldn't say out loud today. Keeping it here for me.", mood: { icon: 'drizzle', colorKey: 'rose' }, author: 'me', private: true },
  { id: 3, date: 'TUE, APR 15', title: 'Our Venice plans', body: "Today we finally decided. May 18, three days, one hotel near San Marco. I'm excited in the quiet way...", mood: { icon: 'sun', colorKey: 'mint' }, author: 'sofia', private: false },
  { id: 4, date: 'MON, APR 14', title: 'Slow Sunday', body: 'We did nothing today. Nothing at all. It felt like everything.', mood: { icon: 'cloud', colorKey: 'sky' }, author: 'me', private: false },
];

export default function Journal() {
  const { C, F } = useTheme();
  const [tab, setTab] = useState<'All' | 'Shared' | 'Private'>('All');
  const filtered =
    tab === 'All' ? ENTRIES : tab === 'Shared' ? ENTRIES.filter((e) => !e.private) : ENTRIES.filter((e) => e.private);

  return (
    <Screen>
      <BlockCard bg={C.butter} ink={C.butterInk} style={{ marginBottom: 16, padding: 22 }}>
        <Overline color="rgba(58,46,8,0.7)">This week · 4 entries</Overline>
        <Text
          style={{
            marginTop: 12,
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 20,
            lineHeight: 27,
            color: C.butterInk,
            maxWidth: 260,
          }}
        >
          "We did nothing today. Nothing at all. It felt like everything."
        </Text>
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 18, height: 2, backgroundColor: C.butterInk, borderRadius: 1, opacity: 0.6 }} />
          <Text
            style={{
              fontSize: 10,
              fontFamily: F.bodyBold,
              letterSpacing: 1,
              color: 'rgba(58,46,8,0.8)',
            }}
          >
            MATTIA · APR 14
          </Text>
        </View>
      </BlockCard>

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 16 }}>
        {(['All', 'Shared', 'Private'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: tab === t ? C.journal : 'transparent',
              alignItems: 'center',
              marginBottom: -1,
            }}
          >
            <Text
              style={{
                color: tab === t ? C.journal : C.fog,
                fontFamily: F.bodyBold,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        {filtered.map((e) => {
          const moodColor = (C as any)[e.mood.colorKey] as string;
          const fromSofia = e.author === 'sofia';
          return (
            <View
              key={e.id}
              style={{
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 18,
                padding: 18,
                paddingLeft: fromSofia ? 20 : 18,
                borderLeftWidth: fromSofia ? 3 : 1,
                borderLeftColor: fromSofia ? C.gold : C.line,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{ fontSize: 10, color: C.fog, fontFamily: F.bodyBold, letterSpacing: 1 }}
                  >
                    {e.date}
                  </Text>
                  {e.private && <Icon name="lock" size={10} color={C.fog} />}
                </View>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: `${moodColor}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={e.mood.icon} size={12} color={moodColor} />
                </View>
              </View>
              {e.title && (
                <Text
                  style={{
                    fontFamily: F.displayBold,
                    fontSize: 18,
                    color: C.bone,
                    marginBottom: 4,
                  }}
                >
                  {e.title}
                </Text>
              )}
              <Text
                numberOfLines={2}
                style={{ fontSize: 13, color: C.mist, lineHeight: 20, fontFamily: F.body }}
              >
                {e.body}
              </Text>
              {fromSofia && (
                <View
                  style={{
                    marginTop: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Avatar letter="S" size={18} bg={C.lavender} color={C.lavenderInk} />
                  <Text
                    style={{
                      fontSize: 10,
                      color: C.gold,
                      fontFamily: F.bodyBold,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Sofia
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
