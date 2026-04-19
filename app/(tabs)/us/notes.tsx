import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AddBtn } from '@/src/components/ui/AddBtn';
import { Screen } from '@/src/components/ui/Screen';
import { SubHeader } from '@/src/components/ui/SubHeader';
import { useTheme } from '@/src/lib/theme';

export default function LoveNotes() {
  const { C, F } = useTheme();
  const earlier = [
    { from: 'me', text: "Thinking about Venice already. Book the gondola that passes your favorite window?", time: 'Wed · 11:30 PM' },
    { from: 'sofia', text: "The way you sang along to Caetano last night. Record that voice of yours. I'm keeping it.", time: 'Wed · 10:12 PM' },
    { from: 'me', text: 'Lunch was so good. Thank you for remembering I hate cilantro.', time: 'Tue · 1:47 PM' },
  ];

  return (
    <Screen>
      {/* Featured rose card */}
      <View style={{ backgroundColor: C.rose, borderRadius: 24, padding: 22, marginBottom: 18 }}>
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
          FROM SOFIA · 7:14 AM
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
          "Morning sunshine. Coffee's on, your socks are in the dryer. I love our Thursdays."
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
      </View>

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
        EARLIER
      </Text>

      {/* legacy AddBtn helper removed; using shared component */}
      {earlier.map((n, i) => {
        const me = n.from === 'me';
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              justifyContent: me ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <View
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
                {n.text}
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
                {n.time}
              </Text>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}
