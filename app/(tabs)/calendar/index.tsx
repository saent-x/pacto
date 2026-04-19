import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTheme } from '@/src/lib/theme';

export default function Calendar() {
  const { C, F } = useTheme();
  const [selectedDay, setSelectedDay] = useState(17);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const events = [
    { id: 1, time: '18:00', title: "Sofia's mom dinner", loc: "Nonna's · Venice", who: 'BOTH', cat: 'family', color: C.peach },
    { id: 2, time: '20:30', title: 'Film night — Past Lives', loc: 'Home', who: 'BOTH', cat: 'date', color: C.rose },
    { id: 3, time: 'All day', title: 'Venice trip planning', loc: '', who: 'MATTIA', cat: 'travel', color: C.sky },
  ];

  return (
    <Screen>
      <View style={{ backgroundColor: C.butter, borderRadius: 26, padding: 22, marginBottom: 22 }}>
        <Text
          style={{
            fontSize: 10,
            color: C.butterInk,
            fontFamily: F.bodyBold,
            letterSpacing: 1.4,
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          THIS MONTH
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 60,
              color: C.butterInk,
              lineHeight: 56,
              letterSpacing: -2,
            }}
          >
            8
          </Text>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 22,
              color: C.butterInk,
              lineHeight: 22,
              marginBottom: 6,
            }}
          >
            events
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            color: C.butterInk,
            fontFamily: F.bodyBold,
            opacity: 0.75,
          }}
        >
          3 shared · 2 upcoming · next in 6h
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          marginBottom: 8,
        }}
      >
        {days.map((d) => (
          <Text
            key={d}
            style={{
              fontSize: 10,
              color: C.fog,
              fontFamily: F.bodyBold,
              letterSpacing: 1.2,
              width: 40,
              textAlign: 'center',
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }}>
        {[14, 15, 16, 17, 18, 19, 20].map((n) => {
          const active = n === selectedDay;
          const hasEvent = [15, 17, 19].includes(n);
          return (
            <Pressable
              key={n}
              onPress={() => setSelectedDay(n)}
              style={{
                width: 40,
                height: 54,
                borderRadius: 14,
                backgroundColor: active ? C.gold : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: F.displayBold,
                  fontSize: 18,
                  color: active ? C.peachInk : C.bone,
                }}
              >
                {n}
              </Text>
              {hasEvent && !active && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: C.gold,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: C.fog, fontFamily: F.bodyBold, letterSpacing: 1.4 }}>
          THURSDAY · 17 APR
        </Text>
        <Text style={{ fontSize: 11, color: C.gold, fontFamily: F.bodyBold }}>3 events</Text>
      </View>

      {events.map((e) => (
        <View key={e.id} style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
          <View style={{ width: 56, paddingTop: 14 }}>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: e.time === 'All day' ? 12 : 18,
                color: C.bone,
                letterSpacing: -0.3,
              }}
            >
              {e.time}
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: C.fog,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
                marginTop: 2,
              }}
            >
              {e.who}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: e.color,
              borderRadius: 20,
              padding: 16,
              overflow: 'hidden',
            }}
          >
            <Text
              style={{
                position: 'absolute',
                top: 12,
                right: 14,
                fontSize: 9,
                fontFamily: F.bodyBold,
                letterSpacing: 1,
                color: '#000',
                opacity: 0.45,
                textTransform: 'uppercase',
              }}
            >
              {e.cat}
            </Text>
            <Text
              style={{
                fontFamily: F.displayBold,
                fontSize: 18,
                color: '#1A0F0A',
                letterSpacing: -0.3,
                marginBottom: e.loc ? 3 : 0,
                lineHeight: 21,
                paddingRight: 40,
              }}
            >
              {e.title}
            </Text>
            {!!e.loc && (
              <Text style={{ fontSize: 11, color: '#1A0F0A', opacity: 0.6, fontFamily: F.body }}>
                {e.loc}
              </Text>
            )}
          </View>
        </View>
      ))}

      <Text
        style={{
          fontSize: 11,
          color: C.fog,
          fontFamily: F.bodyBold,
          letterSpacing: 1.4,
          paddingHorizontal: 4,
          marginTop: 18,
          marginBottom: 10,
        }}
      >
        TOMORROW
      </Text>
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: C.line,
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
            backgroundColor: C.mintInk,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="heart" size={16} color={C.mint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: F.displayBold,
              fontSize: 15,
              color: C.bone,
              letterSpacing: -0.2,
            }}
          >
            Anniversary · 3 yrs
          </Text>
          <Text style={{ fontSize: 11, color: C.fog, fontFamily: F.body }}>Fri 18 · All day</Text>
        </View>
        <Text style={{ fontSize: 10, color: C.mint, fontFamily: F.bodyBold, letterSpacing: 1 }}>
          MILESTONE
        </Text>
      </View>
    </Screen>
  );
}
